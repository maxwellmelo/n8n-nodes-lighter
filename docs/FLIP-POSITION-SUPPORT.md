# Flip Position Support - n8n-nodes-lighter v0.3.2

Data: 2026-01-09

## Resumo

Esta atualizacao adiciona suporte para "flip" de posicao no workflow. Quando um novo sinal de ENTRY chega enquanto uma posicao ainda esta aberta, o workflow agora:

1. Cancela todas as ordens ativas
2. Fecha a posicao atual (se existir)
3. Abre a nova posicao com TP/SL

---

## Problema Anterior

### Cenario
O Pine Script pode gerar um novo sinal de entrada (ENTRY_LONG ou ENTRY_SHORT) enquanto ainda existe uma posicao ativa da operacao anterior.

### Comportamento Antigo
```
Sinal ENTRY_LONG → Abre Long com TP/SL
...posicao ainda aberta...
Sinal ENTRY_SHORT → ERRO: posicao long ainda aberta!
```

O workflow tentava abrir uma nova posicao sem fechar a anterior, causando conflitos.

---

## Nova Solucao: Flip de Posicao

### Novo Fluxo para ENTRY_LONG
```
Route by Alert Type
     ↓
Cancel All Orders (Long)     ← Cancela ordens pendentes
     ↓
Close Any Position (Long)    ← Fecha posicao se existir
     ↓
Get Account Balance (Long)
     ↓
Calculate Size (Long)
     ↓
Open Long with Brackets      ← Abre nova posicao com TP/SL
```

### Novo Fluxo para ENTRY_SHORT
```
Route by Alert Type
     ↓
Cancel All Orders (Short)    ← Cancela ordens pendentes
     ↓
Close Any Position (Short)   ← Fecha posicao se existir
     ↓
Get Account Balance (Short)
     ↓
Calculate Size (Short)
     ↓
Open Short with Brackets     ← Abre nova posicao com TP/SL
```

---

## Nodes Adicionados

### 1. Cancel All Orders (Long/Short)

**Tipo:** Lighter Node
**Operacao:** `cancelAllOrders`
**Configuracao:**
```json
{
  "resource": "trading",
  "operation": "cancelAllOrders"
}
```

**Comportamento de Erro:**
- `onError: "continueRegularOutput"` - Continua mesmo se nao houver ordens

### 2. Close Any Position (Long/Short)

**Tipo:** Lighter Node
**Operacao:** `closePosition`
**Configuracao:**
```json
{
  "resource": "trading",
  "operation": "closePosition",
  "tradingMarketIndex": "={{ $('Parse Signal').item.json.marketIndex }}",
  "tradingSlippage": 0.5
}
```

**Comportamento de Erro:**
- `onError: "continueRegularOutput"` - Continua mesmo se nao houver posicao

---

## Tratamento de Erros

Os novos nodes usam `onError: "continueRegularOutput"` para garantir que o fluxo continue mesmo quando:

1. **Nao ha ordens para cancelar** - O endpoint `cancelAllOrders` pode retornar erro se nao houver ordens ativas
2. **Nao ha posicao para fechar** - O endpoint `closePosition` pode retornar erro se nao houver posicao no mercado especificado

Isso permite que o workflow funcione tanto para:
- **Primeiro sinal:** Nenhuma posicao/ordem existe → continua para abrir nova
- **Flip:** Posicao existe → cancela ordens, fecha posicao, abre nova

---

## Exemplo de Execucao

### Cenario: Flip de Long para Short

```
1. Sinal anterior: ENTRY_LONG em BTC a $95,000
   - Posicao Long aberta
   - TP1: $96,500 | TP2: $97,000 | TP3: $97,500
   - SL: $94,000

2. Novo sinal: ENTRY_SHORT em BTC a $96,200

   Execucao do workflow:
   ├── Cancel All Orders (Short)
   │   └── Cancela TP1, TP2, TP3, SL pendentes
   ├── Close Any Position (Short)
   │   └── Fecha posicao Long a mercado
   ├── Get Account Balance (Short)
   │   └── Busca saldo atualizado
   ├── Calculate Size (Short)
   │   └── Calcula tamanho baseado em risco
   └── Open Short with Brackets
       └── Abre Short com novos TP1/TP2/TP3/SL
```

---

## Arquivos Modificados

### `examples/Lighter - Adaptive Signal Trading System.json`

**Nodes adicionados:**
- `Cancel All Orders (Long)` - ID: `cancel-all-long`
- `Cancel All Orders (Short)` - ID: `cancel-all-short`
- `Close Any Position (Long)` - ID: `close-position-long`
- `Close Any Position (Short)` - ID: `close-position-short`

**Conexoes modificadas:**
- ENTRY_LONG: Route → Cancel All Orders → Close Any Position → Get Balance → Calculate → Open
- ENTRY_SHORT: Route → Cancel All Orders → Close Any Position → Get Balance → Calculate → Open

---

## Vantagens

1. **Sem conflitos de posicao** - Fecha automaticamente posicao anterior
2. **Ordens limpas** - Cancela TP/SL antigos antes de criar novos
3. **Tolerante a erros** - Funciona mesmo sem posicao/ordens existentes
4. **Flip automatico** - Permite trocar de Long para Short (ou vice-versa) sem intervencao manual

---

## Consideracoes Importantes

### Slippage no Close
O fechamento usa slippage de 0.5% para garantir execucao rapida da ordem de mercado ao fechar posicao.

### Ordem de Execucao
A ordem e critica:
1. **Primeiro** cancela ordens (para liberar margem das ordens TP/SL)
2. **Segundo** fecha posicao (para liberar margem da posicao)
3. **Terceiro** abre nova posicao (usando margem liberada)

### Sinais de Exit (TP_HIT, STOP_LOSS, etc.)
Os sinais de saida (TP1_HIT, TP2_HIT, FULL_WIN, STOP_LOSS, PARTIAL) NAO foram modificados. Eles continuam fechando a posicao normalmente sem a logica de flip, pois sao acionados pela propria Lighter quando os triggers sao atingidos.

---

## Proximos Passos

1. **Importar workflow atualizado** no n8n
2. **Testar flip** enviando sinal ENTRY_LONG seguido de ENTRY_SHORT
3. **Verificar** se ordens sao canceladas e posicao fechada antes da nova entrada
