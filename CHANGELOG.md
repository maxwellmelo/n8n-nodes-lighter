# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2025-01-07

### Added

- **Get Auth Token** operation in System resource - Generate auth tokens from Trading Backend for authenticated API calls
- Timestamp parameters for `getFundings` endpoint (Start Time, End Time)
- Sort parameters for `getTrades` endpoint (Sort By, Sort Direction)
- Resolution and time range parameters for `getPnl` endpoint
- Limit and market filter parameters for `getPositionFunding` endpoint

### Fixed

- `getFundings` endpoint now correctly uses `start_timestamp` and `end_timestamp` (milliseconds)
- `getTrades` endpoint now includes required `sort_by` parameter
- `getPnl` endpoint now uses correct `by=index&value=<account_index>` format with timestamps
- `getPositionFunding` endpoint now includes required `limit` parameter
- Backend `get_auth_token` endpoint async handling

### Changed

- Updated endpoint descriptions to indicate which operations require auth tokens:
    - Get Active Orders
    - Get Inactive Orders
    - Get Trades
    - Get PnL (for main accounts)
    - Get Position Funding (for main accounts)
    - Get Deposit/Withdraw/Transfer History

## [0.2.0] - 2025-01-06

### Added

- Trading operations via Python backend (limit orders, market orders, cancel)
- Position operations (close position, update leverage)
- WebSocket Trigger for real-time data streaming
- Support for multiple WebSocket channels (order_book, trade, market_stats, account_all, etc.)

### Fixed

- REST API parameter names (`market_index` -> `market_id`)
- Transaction history endpoint paths
- Dynamic market decimals for order size conversion

## [0.1.0] - 2025-01-05

### Added

- Initial release
- Lighter REST API node with Account, Market, Order, Trade, Transaction, System resources
- LighterTrigger WebSocket node
- LighterApi credentials
- Trading Backend microservice (Python/Flask)
- Docker support for backend deployment
