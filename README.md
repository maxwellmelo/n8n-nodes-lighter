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

### Getting Your Credentials

1. Visit [Lighter](https://app.lighter.xyz) and connect your wallet
2. Create an API key using the Python or Go SDK
3. Find your account index using the `accountsByL1Address` endpoint

Example using Python SDK:
```python
import lighter

client = lighter.SignerClient(
    url="https://mainnet.zklighter.elliot.ai",
    api_private_keys={3: "your_private_key"},
    account_index=YOUR_ACCOUNT_INDEX
)

# Generate auth token (max 8 hours)
auth, err = client.create_auth_token_with_expiry(3600)
```

## Usage Examples

### Get Account Information
1. Add the **Lighter** node to your workflow
2. Select **Resource**: Account
3. Select **Operation**: Get Account
4. Choose **Query By**: Account Index or L1 Address
5. Enter the account index or address

### Subscribe to Order Book Updates
1. Add the **Lighter Trigger** node
2. Select **Channel**: Order Book
3. Enter the **Market Index** (0 = ETH-USD)
4. The trigger will emit events on every orderbook update

### Get Recent Trades
1. Add the **Lighter** node
2. Select **Resource**: Trade
3. Select **Operation**: Get Recent Trades
4. Enter **Market Index** and **Limit**

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

## Resources

- [Lighter Documentation](https://docs.lighter.xyz)
- [API Documentation](https://apidocs.lighter.xyz)
- [Python SDK](https://github.com/elliottech/lighter-python)
- [Go SDK](https://github.com/elliottech/lighter-go)

## License

[MIT](LICENSE.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
