# Análise Completa: Implementação de TP/SL no Workflow Lighter

**Data:** 2026-01-09
**Autor:** Claude Code

---

## 1. SITUAÇÃO ATUAL

### 1.1 Workflow Existente

O workflow `Lighter - Adaptive Signal Trading System.json` atualmente:

1. **Recebe webhook** do TradingView com sinais de trading
2. **Parseia o sinal** extraindo:
   - `symbol`, `marketIndex`
   - `entry`, `stopLoss`, `tp1`, `tp2`, `tp3`
   - `alertType` (ENTRY_LONG, ENTRY_SHORT, TP1_HIT, TP2_HIT, FULL_WIN, STOP_LOSS)
3. **Abre posições** usando `createMarketOrder`
4. **Fecha posições** baseado nos alertas subsequentes do TradingView

### 1.2 Problema Identificado

O workflow atual é **REATIVO** - depende do TradingView enviar alertas de TP/SL. Isso tem problemas:

- Se o TradingView falhar ou atrasar, não há proteção na exchange
- As ordens de TP/SL não ficam registradas no orderbook da Lighter
- Não há proteção automática contra gaps de preço
- Risco de perda se a conexão webhook cair

### 1.3 Dados do Sinal que Já Possuímos

O parser já extrai os preços necessários:
```javascript
const entry = extractPrice('ENTRY');    // Preço de entrada
const stopLoss = extractPrice('SL');    // Stop Loss
const tp1 = extractPrice('TP1');        // Take Profit 1
const tp2 = extractPrice('TP2');        // Take Profit 2
const tp3 = extractPrice('TP3');        // Take Profit 3
```

---

## 2. CAPACIDADES DA API LIGHTER

### 2.1 Tipos de Ordem Suportados

A Lighter API suporta nativamente ordens condicionais:

```python
ORDER_TYPE_LIMIT = 0            # Ordem limite padrão
ORDER_TYPE_MARKET = 1           # Ordem a mercado
ORDER_TYPE_STOP_LOSS = 2        # Stop Loss (market quando trigger)
ORDER_TYPE_STOP_LOSS_LIMIT = 3  # Stop Loss (limit quando trigger)
ORDER_TYPE_TAKE_PROFIT = 4      # Take Profit (market quando trigger)
ORDER_TYPE_TAKE_PROFIT_LIMIT = 5 # Take Profit (limit quando trigger)
ORDER_TYPE_TWAP = 6             # Time-Weighted Average Price
```

### 2.2 SDK Python - Métodos Disponíveis

O SDK `lighter-python` já possui métodos para TP/SL:

```python
# Take Profit
await client.create_tp_order(
    market_index=0,
    client_order_index=123,
    base_amount=1000000,       # Tamanho em base units
    trigger_price=350000,      # Preço que dispara a ordem
    price=350000,              # Preço de execução
    is_ask=True,               # True=SELL, False=BUY
    reduce_only=True           # Apenas reduzir posição
)

await client.create_tp_limit_order(...)  # Mesmos parâmetros, executa como limit

# Stop Loss
await client.create_sl_order(...)        # Mesmos parâmetros
await client.create_sl_limit_order(...)  # Mesmos parâmetros
```

### 2.3 Lógica de Trigger

- **Para LONG (posição comprada)**:
  - TP: Trigger quando `markPrice >= triggerPrice` → Executa SELL
  - SL: Trigger quando `markPrice <= triggerPrice` → Executa SELL

- **Para SHORT (posição vendida)**:
  - TP: Trigger quando `markPrice <= triggerPrice` → Executa BUY
  - SL: Trigger quando `markPrice >= triggerPrice` → Executa BUY

---

## 3. O QUE PRECISA SER MODIFICADO

### 3.1 Backend Python (app.py)

Adicionar novos endpoints:

```python
# Endpoint para criar ordem TP
POST /api/order/tp
{
    "market_index": 0,
    "size": 0.1,
    "trigger_price": 3600.00,
    "price": 3600.00,
    "side": "sell",           # sell para TP de LONG, buy para TP de SHORT
    "reduce_only": true
}

# Endpoint para criar ordem SL
POST /api/order/sl
{
    "market_index": 0,
    "size": 0.1,
    "trigger_price": 3300.00,
    "price": 3300.00,
    "side": "sell",           # sell para SL de LONG, buy para SL de SHORT
    "reduce_only": true
}

# OU um endpoint combinado para entrada com TP/SL
POST /api/order/entry-with-brackets
{
    "market_index": 0,
    "side": "buy",
    "size": 0.1,
    "slippage": 0.5,
    "take_profit": {
        "trigger_price": 3600.00,
        "price": 3600.00
    },
    "stop_loss": {
        "trigger_price": 3300.00,
        "price": 3300.00
    }
}
```

### 3.2 Node Lighter (Lighter.node.ts)

Adicionar novas operações no resource `trading`:

```typescript
{
    name: 'Create TP Order',
    value: 'createTPOrder',
    description: 'Create a take-profit order',
    action: 'Create TP order',
},
{
    name: 'Create SL Order',
    value: 'createSLOrder',
    description: 'Create a stop-loss order',
    action: 'Create SL order',
},
```

Adicionar parâmetro `triggerPrice`:

```typescript
{
    displayName: 'Trigger Price',
    name: 'tradingTriggerPrice',
    type: 'number',
    displayOptions: {
        show: {
            resource: ['trading'],
            operation: ['createTPOrder', 'createSLOrder', 'createTPLimitOrder', 'createSLLimitOrder'],
        },
    },
    default: 0,
    description: 'Price that triggers the conditional order',
},
```

### 3.3 Workflow n8n

Modificar o fluxo de entrada para:

```
[ENTRY Signal]
    → [Check Position]
    → [Calculate Size]
    → [Open Market Order]
    → [Create TP Order 1 (33% @ tp1)]
    → [Create TP Order 2 (33% @ tp2)]
    → [Create TP Order 3 (34% @ tp3)]
    → [Create SL Order (100% @ stopLoss)]
```

---

## 4. IMPLEMENTAÇÃO PROPOSTA

### 4.1 Novo Código para app.py

```python
@app.route("/api/order/tp", methods=["POST"])
@require_auth
@async_route
async def create_tp_order():
    """Create a Take Profit order."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400

        client = get_client()

        market_index = int(data.get("market_index", 0))
        side = data.get("side", "sell").lower()
        size = float(data.get("size", 0))
        trigger_price = float(data.get("trigger_price", 0))
        price = float(data.get("price", 0)) or trigger_price
        reduce_only = bool(data.get("reduce_only", True))
        client_order_id = int(data.get("client_order_id", 0)) or int(time.time() * 1000)

        if size <= 0:
            return jsonify({"error": "size must be > 0"}), 400
        if trigger_price <= 0:
            return jsonify({"error": "trigger_price must be > 0"}), 400

        is_ask = side == "sell"

        # Get market decimals for proper conversion
        size_dec, price_dec = await get_market_decimals(market_index)
        base_amount = convert_size_to_base_amount(size, size_dec)
        trigger_price_int = convert_price_to_int(trigger_price, price_dec)
        price_int = convert_price_to_int(price, price_dec)

        # Execute with automatic retry on nonce errors
        tx, response, err = await execute_with_nonce_retry(
            client.create_tp_order,
            market_index=market_index,
            client_order_index=client_order_id,
            base_amount=base_amount,
            trigger_price=trigger_price_int,
            price=price_int,
            is_ask=is_ask,
            reduce_only=reduce_only,
        )

        if err:
            return jsonify({"success": False, "error": str(err)}), 400

        return jsonify({
            "success": True,
            "tx_hash": response.tx_hash if response else None,
            "order": {
                "market_index": market_index,
                "side": side,
                "size": size,
                "trigger_price": trigger_price,
                "price": price,
                "type": "take_profit",
            },
        })

    except Exception as e:
        logger.exception("Error creating TP order")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/order/sl", methods=["POST"])
@require_auth
@async_route
async def create_sl_order():
    """Create a Stop Loss order."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400

        client = get_client()

        market_index = int(data.get("market_index", 0))
        side = data.get("side", "sell").lower()
        size = float(data.get("size", 0))
        trigger_price = float(data.get("trigger_price", 0))
        price = float(data.get("price", 0)) or trigger_price
        reduce_only = bool(data.get("reduce_only", True))
        client_order_id = int(data.get("client_order_id", 0)) or int(time.time() * 1000)

        if size <= 0:
            return jsonify({"error": "size must be > 0"}), 400
        if trigger_price <= 0:
            return jsonify({"error": "trigger_price must be > 0"}), 400

        is_ask = side == "sell"

        # Get market decimals for proper conversion
        size_dec, price_dec = await get_market_decimals(market_index)
        base_amount = convert_size_to_base_amount(size, size_dec)
        trigger_price_int = convert_price_to_int(trigger_price, price_dec)
        price_int = convert_price_to_int(price, price_dec)

        # Execute with automatic retry on nonce errors
        tx, response, err = await execute_with_nonce_retry(
            client.create_sl_order,
            market_index=market_index,
            client_order_index=client_order_id,
            base_amount=base_amount,
            trigger_price=trigger_price_int,
            price=price_int,
            is_ask=is_ask,
            reduce_only=reduce_only,
        )

        if err:
            return jsonify({"success": False, "error": str(err)}), 400

        return jsonify({
            "success": True,
            "tx_hash": response.tx_hash if response else None,
            "order": {
                "market_index": market_index,
                "side": side,
                "size": size,
                "trigger_price": trigger_price,
                "price": price,
                "type": "stop_loss",
            },
        })

    except Exception as e:
        logger.exception("Error creating SL order")
        return jsonify({"success": False, "error": str(e)}), 500
```

### 4.2 Endpoint Combinado (Opcional)

```python
@app.route("/api/order/entry-with-brackets", methods=["POST"])
@require_auth
@async_route
async def create_entry_with_brackets():
    """
    Create entry order with TP and SL brackets in a single call.
    This is more efficient and ensures all orders are placed atomically.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400

        client = get_client()
        order_api = get_order_api()

        market_index = int(data.get("market_index", 0))
        side = data.get("side", "buy").lower()
        size = float(data.get("size", 0))
        slippage = float(data.get("slippage", 0.5)) / 100

        tp_config = data.get("take_profit", {})
        sl_config = data.get("stop_loss", {})

        if size <= 0:
            return jsonify({"error": "size must be > 0"}), 400

        results = {
            "entry": None,
            "take_profit": None,
            "stop_loss": None,
            "errors": []
        }

        # Get market decimals
        size_dec, price_dec = await get_market_decimals(market_index)
        base_amount = convert_size_to_base_amount(size, size_dec)
        is_ask_entry = side == "sell"

        # 1. Create entry order (market)
        orderbook = await order_api.order_book_orders(market_id=market_index, limit=1)

        if is_ask_entry and orderbook.bids:
            current_price = float(orderbook.bids[0].price)
        elif not is_ask_entry and orderbook.asks:
            current_price = float(orderbook.asks[0].price)
        else:
            return jsonify({"error": "Could not get current price"}), 400

        slippage_multiplier = (1 - slippage) if is_ask_entry else (1 + slippage)
        execution_price = current_price * slippage_multiplier
        price_int = convert_price_to_int(execution_price, price_dec)

        tx, response, err = await execute_with_nonce_retry(
            client.create_order,
            market_index=market_index,
            client_order_index=int(time.time() * 1000),
            base_amount=base_amount,
            price=price_int,
            is_ask=is_ask_entry,
            order_type=client.ORDER_TYPE_MARKET,
            time_in_force=client.ORDER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
            reduce_only=False,
            order_expiry=client.DEFAULT_IOC_EXPIRY,
        )

        if err:
            results["errors"].append({"type": "entry", "error": str(err)})
            return jsonify({"success": False, **results}), 400

        results["entry"] = {
            "tx_hash": response.tx_hash if response else None,
            "side": side,
            "size": size,
            "execution_price": execution_price,
        }

        # For brackets: opposite side of entry
        bracket_is_ask = not is_ask_entry  # LONG entry = SELL for TP/SL, SHORT entry = BUY for TP/SL

        # 2. Create Take Profit order
        if tp_config.get("trigger_price"):
            tp_trigger = float(tp_config["trigger_price"])
            tp_price = float(tp_config.get("price", tp_trigger))
            tp_trigger_int = convert_price_to_int(tp_trigger, price_dec)
            tp_price_int = convert_price_to_int(tp_price, price_dec)

            tx, response, err = await execute_with_nonce_retry(
                client.create_tp_order,
                market_index=market_index,
                client_order_index=int(time.time() * 1000) + 1,
                base_amount=base_amount,
                trigger_price=tp_trigger_int,
                price=tp_price_int,
                is_ask=bracket_is_ask,
                reduce_only=True,
            )

            if err:
                results["errors"].append({"type": "take_profit", "error": str(err)})
            else:
                results["take_profit"] = {
                    "tx_hash": response.tx_hash if response else None,
                    "trigger_price": tp_trigger,
                    "price": tp_price,
                    "size": size,
                }

        # 3. Create Stop Loss order
        if sl_config.get("trigger_price"):
            sl_trigger = float(sl_config["trigger_price"])
            sl_price = float(sl_config.get("price", sl_trigger))
            sl_trigger_int = convert_price_to_int(sl_trigger, price_dec)
            sl_price_int = convert_price_to_int(sl_price, price_dec)

            tx, response, err = await execute_with_nonce_retry(
                client.create_sl_order,
                market_index=market_index,
                client_order_index=int(time.time() * 1000) + 2,
                base_amount=base_amount,
                trigger_price=sl_trigger_int,
                price=sl_price_int,
                is_ask=bracket_is_ask,
                reduce_only=True,
            )

            if err:
                results["errors"].append({"type": "stop_loss", "error": str(err)})
            else:
                results["stop_loss"] = {
                    "tx_hash": response.tx_hash if response else None,
                    "trigger_price": sl_trigger,
                    "price": sl_price,
                    "size": size,
                }

        return jsonify({
            "success": len(results["errors"]) == 0,
            **results
        })

    except Exception as e:
        logger.exception("Error creating entry with brackets")
        return jsonify({"success": False, "error": str(e)}), 500
```

---

## 5. NOVO FLUXO DO WORKFLOW

### 5.1 Fluxo Simplificado com Brackets

```
TradingView Webhook
        ↓
   Parse Signal
        ↓
   Valid Signal? ─────────────────────┐
        ↓ Yes                         │ No
   Route by Type                      ↓
        │                          [Ignore]
        ├── ENTRY_LONG ────→ [Entry with Brackets]
        │                      - Market BUY
        │                      - TP SELL @ tp1, tp2, tp3
        │                      - SL SELL @ stopLoss
        │
        ├── ENTRY_SHORT ───→ [Entry with Brackets]
        │                      - Market SELL
        │                      - TP BUY @ tp1, tp2, tp3
        │                      - SL BUY @ stopLoss
        │
        ├── TP1_HIT ────────→ [Opcional: Ajustar ordens restantes]
        ├── TP2_HIT ────────→ [Opcional: Ajustar SL para breakeven]
        ├── FULL_WIN ───────→ [Verificar/cancelar ordens pendentes]
        └── STOP_LOSS ──────→ [Verificar/cancelar ordens pendentes]
```

### 5.2 Comportamento dos TPs com Ordens na Exchange

Com as ordens de TP/SL diretamente na Lighter:

1. **Entrada LONG BTC @ 90000**
   - Entry: Market BUY 0.1 BTC
   - TP1: Conditional SELL 0.033 BTC @ trigger 91000
   - TP2: Conditional SELL 0.033 BTC @ trigger 92000
   - TP3: Conditional SELL 0.034 BTC @ trigger 93000
   - SL: Conditional SELL 0.1 BTC @ trigger 88000

2. **Quando TP1 é atingido (preço >= 91000)**
   - A Lighter automaticamente executa o SELL de 0.033 BTC
   - Os outros TP e SL continuam ativos

3. **Quando SL é atingido (preço <= 88000)**
   - A Lighter automaticamente executa o SELL de 0.1 BTC
   - Pode haver conflito se TPs parciais já foram executados

### 5.3 Gestão de Conflitos

**Problema**: Se TP1 executar, o tamanho do SL ainda é 100% da posição original.

**Soluções**:
1. **SL proporcional**: Criar SL apenas para o tamanho não coberto pelos TPs
2. **Ajuste dinâmico**: Quando TP1 executa, cancelar SL antigo e criar novo com tamanho atualizado
3. **One-Cancels-Other (OCO)**: Usar grupos de ordens se a API suportar

---

## 6. RESUMO DAS MODIFICAÇÕES NECESSÁRIAS

### 6.1 Backend Python (app.py)

| Modificação | Prioridade | Complexidade |
|-------------|------------|--------------|
| Adicionar endpoint `/api/order/tp` | Alta | Baixa |
| Adicionar endpoint `/api/order/sl` | Alta | Baixa |
| Adicionar endpoint `/api/order/tp-limit` | Média | Baixa |
| Adicionar endpoint `/api/order/sl-limit` | Média | Baixa |
| Adicionar endpoint `/api/order/entry-with-brackets` | Alta | Média |

### 6.2 Node Lighter (Lighter.node.ts)

| Modificação | Prioridade | Complexidade |
|-------------|------------|--------------|
| Adicionar operation `createTPOrder` | Alta | Baixa |
| Adicionar operation `createSLOrder` | Alta | Baixa |
| Adicionar operation `createTPLimitOrder` | Média | Baixa |
| Adicionar operation `createSLLimitOrder` | Média | Baixa |
| Adicionar parâmetro `tradingTriggerPrice` | Alta | Baixa |

### 6.3 Workflow n8n

| Modificação | Prioridade | Complexidade |
|-------------|------------|--------------|
| Modificar fluxo ENTRY para criar brackets | Alta | Média |
| Adicionar nodes de TP/SL após entrada | Alta | Média |
| Lógica de cancelamento quando posição fecha | Média | Alta |
| Ajuste de SL quando TPs parciais executam | Baixa | Alta |

---

## 7. PRÓXIMOS PASSOS

1. **Implementar endpoints TP/SL no backend** (app.py)
2. **Adicionar operações no node Lighter** (Lighter.node.ts)
3. **Testar na testnet** da Lighter
4. **Atualizar workflow** com os novos nodes
5. **Documentar** as novas funcionalidades

---

## 8. FONTES

- [Lighter Docs - Orders and Matching](https://docs.lighter.xyz/perpetual-futures/orders-and-matching)
- [Lighter API Documentation](https://apidocs.lighter.xyz)
- [lighter-python SDK](https://github.com/elliottech/lighter-python)
- [lighter-python signer_client.py](https://github.com/elliottech/lighter-python/blob/main/lighter/signer_client.py)
