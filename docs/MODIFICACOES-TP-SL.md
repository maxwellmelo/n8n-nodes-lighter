# Modificacoes TP/SL - n8n-nodes-lighter v0.3.2

Data: 2026-01-09

## Resumo das Alteracoes

Esta atualizacao adiciona suporte completo para ordens Take Profit (TP) e Stop Loss (SL) na Lighter DEX, permitindo que o workflow crie automaticamente ordens de protecao ao abrir uma posicao.

---

## 1. Backend Python (app.py)

### ANTES
O backend so suportava ordens de mercado e limite:
- `POST /api/order/market` - Ordem de mercado
- `POST /api/order/limit` - Ordem limitada

### DEPOIS
Adicionados 5 novos endpoints:

#### 1.1 `POST /api/order/tp`
Cria uma ordem Take Profit (tipo 4).
```json
{
    "market_index": 0,
    "side": "sell",
    "size": 0.1,
    "trigger_price": 3500.00,
    "price": 3500.00,
    "reduce_only": true
}
```

#### 1.2 `POST /api/order/tp-limit`
Cria uma ordem Take Profit Limit (tipo 5).
```json
{
    "market_index": 0,
    "side": "sell",
    "size": 0.1,
    "trigger_price": 3500.00,
    "price": 3490.00,
    "reduce_only": true
}
```

#### 1.3 `POST /api/order/sl`
Cria uma ordem Stop Loss (tipo 2).
```json
{
    "market_index": 0,
    "side": "sell",
    "size": 0.1,
    "trigger_price": 3200.00,
    "price": 3200.00,
    "reduce_only": true
}
```

#### 1.4 `POST /api/order/sl-limit`
Cria uma ordem Stop Loss Limit (tipo 3).
```json
{
    "market_index": 0,
    "side": "sell",
    "size": 0.1,
    "trigger_price": 3200.00,
    "price": 3180.00,
    "reduce_only": true
}
```

#### 1.5 `POST /api/order/entry-with-brackets`
Cria ordem de entrada com TP e SL em uma unica chamada.
```json
{
    "market_index": 0,
    "side": "buy",
    "size": 0.1,
    "slippage": 0.5,
    "take_profits": [
        {"trigger_price": 3600.00, "size_percent": 33},
        {"trigger_price": 3700.00, "size_percent": 33},
        {"trigger_price": 3800.00, "size_percent": 34}
    ],
    "stop_loss": {
        "trigger_price": 3200.00
    }
}
```

### Vantagens
- Ordens TP/SL sao criadas automaticamente junto com a entrada
- Suporta ate 3 niveis de Take Profit com percentuais personalizaveis
- Todas as ordens de protecao usam `reduce_only=true` para seguranca
- Uma unica chamada API cria todas as ordens necessarias

---

## 2. Node Lighter.node.ts

### ANTES
Operacoes de trading disponiveis:
- `createMarketOrder`
- `createLimitOrder`
- `cancelOrder`
- `cancelAllOrders`
- `closePosition`

### DEPOIS
Adicionadas 5 novas operacoes:

#### 2.1 `createTPOrder`
Cria ordem Take Profit.
- Parametros: market_index, side, size, trigger_price, price, reduce_only

#### 2.2 `createTPLimitOrder`
Cria ordem Take Profit Limit.
- Parametros: market_index, side, size, trigger_price, price, reduce_only

#### 2.3 `createSLOrder`
Cria ordem Stop Loss.
- Parametros: market_index, side, size, trigger_price, price, reduce_only

#### 2.4 `createSLLimitOrder`
Cria ordem Stop Loss Limit.
- Parametros: market_index, side, size, trigger_price, price, reduce_only

#### 2.5 `createEntryWithBrackets`
Cria entrada com TP e SL em uma chamada.
- Parametros:
  - `tradingMarketIndex` - Indice do mercado
  - `tradingSide` - buy ou sell
  - `tradingSize` - Tamanho da posicao
  - `tradingSlippage` - Slippage permitido (%)
  - `tradingTP1Price` - Preco do TP1
  - `tradingTP1Percent` - Percentual para TP1 (default: 33%)
  - `tradingTP2Price` - Preco do TP2
  - `tradingTP2Percent` - Percentual para TP2 (default: 33%)
  - `tradingTP3Price` - Preco do TP3
  - `tradingTP3Percent` - Percentual para TP3 (default: 34%)
  - `tradingSLPrice` - Preco do Stop Loss

### Vantagens
- Interface visual no n8n para configurar TP/SL
- Expressoes suportadas em todos os campos
- Valores default ja configurados (33%/33%/34%)

---

## 3. Workflow Atualizado

### ANTES
Nodes "Open Long Position" e "Open Short Position" usavam:
```json
{
    "operation": "createMarketOrder",
    "tradingMarketIndex": "={{ $json.marketIndex }}",
    "tradingSize": "={{ $json.positionSize }}"
}
```

### DEPOIS
Agora usam:
```json
{
    "operation": "createEntryWithBrackets",
    "tradingMarketIndex": "={{ $json.marketIndex }}",
    "tradingSize": "={{ $json.positionSize }}",
    "tradingSlippage": 0.5,
    "tradingTP1Price": "={{ $json.tp1 }}",
    "tradingTP1Percent": 33,
    "tradingTP2Price": "={{ $json.tp2 }}",
    "tradingTP2Percent": 33,
    "tradingTP3Price": "={{ $json.tp3 }}",
    "tradingTP3Percent": 34,
    "tradingSLPrice": "={{ $json.stopLoss }}"
}
```

### Nodes "Calculate Size" Atualizados
Agora passam os precos de TP/SL para os nodes de abertura:
```javascript
return {
  // ... outros campos ...
  tp1: signal.tp1 || 0,
  tp2: signal.tp2 || 0,
  tp3: signal.tp3 || 0,
  stopLoss: signal.stopLoss || 0
};
```

### Vantagens
- Ao receber um sinal de ENTRY, o workflow agora:
  1. Abre a posicao a mercado
  2. Cria ordem TP1 (33% da posicao)
  3. Cria ordem TP2 (33% da posicao)
  4. Cria ordem TP3 (34% da posicao)
  5. Cria ordem SL (100% da posicao)
- Protecao automatica contra perdas
- Take profits escalonados para maximizar lucros

---

## 4. Como os Tipos de Ordem Funcionam

### Take Profit (TP)
- **Tipo 4** (TP) - Executa a mercado quando o trigger e atingido
- **Tipo 5** (TP Limit) - Cria ordem limitada quando o trigger e atingido
- Para LONG: trigger_price > preco atual
- Para SHORT: trigger_price < preco atual

### Stop Loss (SL)
- **Tipo 2** (SL) - Executa a mercado quando o trigger e atingido
- **Tipo 3** (SL Limit) - Cria ordem limitada quando o trigger e atingido
- Para LONG: trigger_price < preco atual
- Para SHORT: trigger_price > preco atual

---

## 5. Arquivos Modificados

1. `examples/lighter-backend/app.py`
   - +5 novos endpoints de TP/SL
   - ~470 linhas de codigo

2. `nodes/Lighter/Lighter.node.ts`
   - +5 novas operacoes de trading
   - +8 novos parametros para TP/SL
   - Logica de execucao para novos endpoints

3. `examples/Lighter - Adaptive Signal Trading System.json`
   - Nodes "Open Long/Short Position" atualizados
   - Nodes "Calculate Size" atualizados
   - Sticky note atualizado

---

## 6. Proximos Passos

1. **Testar em ambiente de desenvolvimento**
   - Verificar criacao de ordens TP/SL
   - Validar execucao dos triggers

2. **Ajustar percentuais se necessario**
   - Os defaults sao 33%/33%/34%
   - Podem ser ajustados no workflow

3. **Monitorar execucoes**
   - Verificar se ordens sao criadas corretamente
   - Validar que reduce_only esta funcionando
