# n8n-nodes-lighter

This is an n8n community node for **Lighter (zkLighter)** - a high-performance perpetuals DEX built on a zero-knowledge rollup on Ethereum.

[Lighter](https://lighter.xyz) | [API Documentation](https://apidocs.lighter.xyz) | [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## Features

### Lighter Node (REST API)
- **Account Operations**: Get account info, positions, PnL, liquidations, funding data
- **Market Operations**: Order books, exchange stats, funding rates
- **Order Operations**: Active/inactive orders, order history export
- **Trade Operations**: Recent trades, trade history
- **Transaction Operations**: Transaction details, deposit/withdraw/transfer history
- **System Operations**: Status, info, announcements
- **Trading Operations** (via Backend): Create/cancel orders, close positions, update leverage
- **Position Operations** (via Backend): Get positions and active orders
- **TP/SL Orders** (v0.3.2+): Take Profit and Stop Loss orders with bracket entries

### Lighter Trigger (WebSocket)
Real-time data streaming via WebSocket:
- Order book updates (50ms intervals)
- Market statistics
- Trade feed
- Account positions, orders, trades
- Notifications (liquidations, deleveraging)
- Blockchain height updates

## Installation

### Community Nodes (Recommended)
1. Go to **Settings > Community Nodes** in n8n
2. Select **Install**
3. Enter `n8n-nodes-lighter`
4. Click **Install**

### Manual Installation
```bash
cd ~/.n8n/nodes
npm install n8n-nodes-lighter
```

## Credentials

To use this node, you need to set up Lighter API credentials:

1. **Environment**: Choose between Mainnet or Testnet
2. **Account Index**: Your Lighter account index (find it using `accountsByL1Address` endpoint)
3. **API Key Index**: Your API key index (3-254, indices 0-2 are reserved)
4. **API Private Key**: Your API private key for signing transactions
5. **Auth Token** (Optional): Pre-generated auth token for authenticated endpoints
6. **Trading Backend URL** (Required for trading): URL of the Trading Backend microservice
7. **Backend API Secret** (Optional): Secret for authenticating with the trading backend

### Getting Your Credentials

1. Visit [Lighter](https://app.lighter.xyz) and connect your wallet
2. Create an API key using the Python or Go SDK
3. Find your account index using the `accountsByL1Address` endpoint

Example using Python SDK:
```python
import zklighter

client = zklighter.SignerClient(
    url="https://mainnet.zklighter.elliot.ai",
    api_private_keys={3: "your_private_key"},
    account_index=YOUR_ACCOUNT_INDEX
)

# Generate auth token (max 8 hours)
auth, err = client.create_auth_token_with_expiry(3600)
```

## Trading Operations (Backend Required)

Lighter requires cryptographic signatures for trading operations. Since the signing library is platform-specific (not available in pure JavaScript), we provide a Python microservice backend.

### Setting Up the Trading Backend

#### Option 1: Docker (Recommended)
```bash
cd examples/lighter-backend

# Build the image
docker build -t lighter-backend .

# Run with your credentials
docker run -d \
  -p 3001:3001 \
  -e LIGHTER_API_KEY="your_private_key" \
  -e LIGHTER_ACCOUNT_INDEX="0" \
  -e LIGHTER_API_KEY_INDEX="3" \
  -e LIGHTER_ENVIRONMENT="mainnet" \
  -e API_SECRET="optional_secret" \
  --name lighter-backend \
  lighter-backend
```

#### Option 2: Manual Setup
```bash
cd examples/lighter-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export LIGHTER_API_KEY="your_private_key"
export LIGHTER_ACCOUNT_INDEX="0"
export LIGHTER_API_KEY_INDEX="3"
export LIGHTER_ENVIRONMENT="mainnet"

# Run the server
python app.py
```

### Configuring n8n

After starting the backend, add the URL to your Lighter credentials:
- **Trading Backend URL**: `http://localhost:3001` (or your server URL)
- **Backend API Secret**: Same as `API_SECRET` if you set one

### Available Trading Operations

| Operation | Description |
|-----------|-------------|
| Create Limit Order | Place a limit order with specified price |
| Create Market Order | Place a market order with slippage |
| Create Take Profit Order | Place a TP order that triggers at specified price |
| Create Take Profit Limit Order | Place a TP limit order with trigger price |
| Create Stop Loss Order | Place a SL order that triggers at specified price |
| Create Stop Loss Limit Order | Place a SL limit order with trigger price |
| Create Entry with Brackets | Open position with TP1/TP2/TP3 and SL in one call |
| Cancel Order | Cancel a specific order by index |
| Cancel All Orders | Cancel all open orders |
| Close Position | Close an open position with market order |
| Update Leverage | Change leverage for a market |

## Usage Examples

### Get Account Information
1. Add the **Lighter** node to your workflow
2. Select **Resource**: Account
3. Select **Operation**: Get Account
4. Choose **Query By**: Account Index or L1 Address
5. Enter the account index or address

### Create a Limit Order
1. Add the **Lighter** node to your workflow
2. Select **Resource**: Trading
3. Select **Operation**: Create Limit Order
4. Enter:
   - **Market Index**: 0 (ETH-USD)
   - **Side**: Buy or Sell
   - **Size**: Order size (e.g., 0.1)
   - **Price**: Limit price (e.g., 2500)

### Close a Position
1. Add the **Lighter** node to your workflow
2. Select **Resource**: Trading
3. Select **Operation**: Close Position
4. Enter:
   - **Market Index**: 0 (ETH-USD)
   - **Slippage %**: 0.5 (default)

### Subscribe to Order Book Updates
1. Add the **Lighter Trigger** node
2. Select **Channel**: Order Book
3. Enter the **Market Index** (0 = ETH-USD)
4. The trigger will emit events on every orderbook update

### Create Entry with TP/SL (Brackets)
1. Add the **Lighter** node to your workflow
2. Select **Resource**: Trading
3. Select **Operation**: Create Entry with Brackets
4. Enter:
   - **Market Index**: 0 (ETH-USD)
   - **Side**: Buy or Sell
   - **Size**: Order size (e.g., 0.1)
   - **Slippage %**: 0.5
   - **TP1 Price**: First take profit price (33% of position)
   - **TP2 Price**: Second take profit price (33% of position)
   - **TP3 Price**: Third take profit price (34% of position)
   - **Stop Loss Price**: Stop loss trigger price

This creates a market entry order along with 3 take profit orders and 1 stop loss order automatically.

## API Reference

### Markets
| Index | Symbol |
|-------|--------|
| 0 | ETH-USD |
| 1 | BTC-USD |
| 2 | SOL-USD |
| ... | ... |

Use the `Get Order Books` operation to retrieve all available markets.

### Rate Limits
- **Standard Account**: 60 weighted requests/minute
- **Premium Account**: 24,000 weighted requests/minute
- **WebSocket**: 100 connections, 1000 subscriptions total

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│     n8n         │────▶│  Trading        │────▶│   Lighter       │
│   Workflow      │     │  Backend        │     │   Exchange      │
│                 │     │  (Python)       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                                               ▲
       │                                               │
       └───────────────────────────────────────────────┘
                    (Read-only operations)
```

- **Read operations** (Account, Market, Order info): Direct API calls
- **Write operations** (Trading): Via Python backend for cryptographic signing

## Resources

- [Lighter Documentation](https://docs.lighter.xyz)
- [API Documentation](https://apidocs.lighter.xyz)
- [Python SDK](https://github.com/elliottech/lighter-python)
- [Go SDK](https://github.com/elliottech/lighter-go)

## Author

Maxwell Melo <maxwell.melo0@gmail.com>

## License

[MIT](LICENSE.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
