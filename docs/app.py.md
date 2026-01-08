# Modificacoes no Trading Backend (app.py)

**Data**: 2026-01-08
**Arquivo**: `examples/lighter-backend/app.py`

---

## Problema Original

Erro `invalid nonce` (code=21104) ao executar ordens de trading na Lighter DEX.

```json
{
  "error": "HTTP response body: code=21104 message='invalid nonce'"
}
```

### Causa Raiz

1. O backend usava `NonceManagerType.OPTIMISTIC` que mantinha o nonce localmente
2. O nonce local dessincronizava do servidor quando:
   - O backend era reiniciado
   - Ocorriam requisicoes concorrentes
   - Timeouts/erros ocorriam

---

## Solucao Implementada

### 1. Mudanca de OPTIMISTIC para API Mode

**Antes:**
```python
nonce_management_type=nonce_manager.NonceManagerType.OPTIMISTIC
```

**Depois:**
```python
nonce_management_type=nonce_manager.NonceManagerType.API
```

**Vantagem**: O modo API busca o nonce do servidor a CADA requisicao, eliminando problemas de dessincronizacao.

---

### 2. Sistema de Retry Automatico

Adicionado `execute_with_nonce_retry()` que:
- Detecta erros de nonce automaticamente
- Tenta novamente ate N vezes (configuravel)
- Faz refresh do nonce entre tentativas
- Reseta o cliente completamente se todas tentativas falharem

**Padrao de deteccao de erro de nonce:**
```python
NONCE_ERROR_PATTERNS = [
    "invalid nonce",
    "nonce",
    "21104",
]
```

---

### 3. Novas Variaveis de Ambiente

| Variavel | Default | Descricao |
|----------|---------|-----------|
| `NONCE_RETRY_ATTEMPTS` | 3 | Numero maximo de tentativas em caso de erro de nonce |
| `NONCE_RETRY_DELAY_MS` | 500 | Delay entre tentativas (ms) |

---

### 4. Novos Endpoints de Debug

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/nonce/refresh` | POST | Forca refresh do nonce do servidor |
| `/api/client/reset` | POST | Reseta o cliente completamente |

---

## Endpoints Atualizados com Retry

Todos os endpoints de trading agora usam retry automatico:

- `POST /api/order/limit` - Criar ordem limite
- `POST /api/order/market` - Criar ordem de mercado  
- `POST /api/order/cancel` - Cancelar ordem
- `POST /api/order/cancel-all` - Cancelar todas as ordens
- `POST /api/position/close` - Fechar posicao
- `POST /api/position/update-leverage` - Atualizar alavancagem

---

## Fluxo de Retry

```
Requisicao de Trading
        |
        v
    Executar Operacao
        |
    Erro de Nonce? 
        |
   Sim  |  Nao
        |    \--> Retornar resultado
        v
    Tentativa < Max?
        |
   Sim  |  Nao
        |    \--> Reset cliente + Retornar erro
        v
    Refresh Nonce
        |
        v
    Aguardar delay
        |
        v
    Tentar novamente
```

---

## Exemplo de Log

```
2026-01-08 12:35:05 - WARNING - Nonce error on attempt 1/3: invalid nonce
2026-01-08 12:35:05 - INFO - Nonce refreshed for API key 3
2026-01-08 12:35:06 - INFO - Order created successfully
```

---

## Beneficios

1. **Elimina erros de nonce**: Modo API sempre busca nonce fresco
2. **Auto-recuperacao**: Retry automatico resolve problemas transientes  
3. **Observabilidade**: Logs detalhados de tentativas
4. **Configuravel**: Parametros ajustaveis via env vars
5. **Debug facilitado**: Endpoints para refresh/reset manual
