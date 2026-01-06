# Lighter Trading Backend

Este é um microserviço que serve como ponte entre o n8n e a Lighter DEX.

A Lighter requer assinatura EIP-712 das transações, o que só pode ser feito via SDK oficial. Este backend recebe requisições HTTP simples do n8n e executa as operações na Lighter.

## Instalação

```bash
cd lighter-backend
pip install -r requirements.txt
```

## Configuração

Configure as variáveis de ambiente:

```bash
export LIGHTER_API_KEY='sua_chave_privada_da_api'
export LIGHTER_ACCOUNT_INDEX='seu_account_index'
export LIGHTER_API_KEY_INDEX='3'  # 3-254, padrão é 3
export LIGHTER_ENVIRONMENT='mainnet'  # ou 'testnet'
```

Ou crie um arquivo `.env`:

```env
LIGHTER_API_KEY=sua_chave_privada_da_api
LIGHTER_ACCOUNT_INDEX=123456
LIGHTER_API_KEY_INDEX=3
LIGHTER_ENVIRONMENT=mainnet
```

## Uso

```bash
python app.py
```

O servidor iniciará em `http://localhost:3001`

## Endpoints

### Health Check
```
GET /health
```

### Criar Ordem
```
POST /api/lighter/order
Content-Type: application/json

{
    "market_index": 0,        // 0=ETH, 1=BTC, 2=SOL
    "is_ask": false,          // false=compra, true=venda
    "base_amount": 0.1,       // Quantidade
    "price": 0,               // 0 para market order
    "order_type": "market",   // "market" ou "limit"
    "reduce_only": false      // Se é apenas para reduzir
}
```

### Fechar Posição
```
POST /api/lighter/close-position
Content-Type: application/json

{
    "market_index": 0
}
```

### Cancelar Todas Ordens
```
POST /api/lighter/cancel-all
Content-Type: application/json

{
    "market_index": 0  // Opcional, se não especificado cancela todas
}
```

### Obter Conta
```
GET /api/lighter/account
```

### Obter Posições
```
GET /api/lighter/positions
```

## Integração com n8n

No n8n, configure os nodes HTTP Request para apontar para este backend:

```
URL: http://localhost:3001/api/lighter/order
Method: POST
Headers: Content-Type: application/json
Body: {parâmetros da ordem}
```

## Mercados Disponíveis

| Index | Símbolo |
|-------|---------|
| 0 | ETH-USD |
| 1 | BTC-USD |
| 2 | SOL-USD |

Use `GET /api/v1/orderBooks` na API da Lighter para ver todos os mercados.

## Deploy em Produção

Para produção, use:
- **Gunicorn**: `gunicorn -w 4 -b 0.0.0.0:3001 app:app`
- **Docker**: Veja Dockerfile exemplo
- **Render/Railway/Fly.io**: Deploy fácil com variáveis de ambiente

### Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app.py .
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:3001", "app:app"]
```

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca exponha este backend publicamente sem autenticação
- Use HTTPS em produção
- Mantenha a API key segura
- Considere usar um firewall/VPN
