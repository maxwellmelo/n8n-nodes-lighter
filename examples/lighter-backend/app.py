"""
Lighter Trading Backend
========================
Microservice Flask that receives requests from n8n
and executes orders on Lighter using the official SDK.

Installation:
    pip install -r requirements.txt

Usage:
    python app.py

Configuration via environment variables:
    LIGHTER_API_KEY - Your API private key
    LIGHTER_ACCOUNT_INDEX - Your account index
    LIGHTER_API_KEY_INDEX - API key index (default: 3)
    LIGHTER_ENVIRONMENT - 'mainnet' or 'testnet' (default: mainnet)
    FLASK_PORT - Server port (default: 3001)
    API_SECRET - Optional secret for authentication

Author: Maxwell Melo <maxwell.melo0@gmail.com>
"""

import os
import time
import asyncio
import logging
from flask import Flask, request, jsonify
from functools import wraps

# Fix event loop issues with Gunicorn workers
import nest_asyncio
nest_asyncio.apply()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
LIGHTER_API_KEY = os.getenv("LIGHTER_API_KEY", "")
LIGHTER_ACCOUNT_INDEX = int(os.getenv("LIGHTER_ACCOUNT_INDEX", "0"))
LIGHTER_API_KEY_INDEX = int(os.getenv("LIGHTER_API_KEY_INDEX", "3"))
LIGHTER_ENVIRONMENT = os.getenv("LIGHTER_ENVIRONMENT", "mainnet")
FLASK_PORT = int(os.getenv("FLASK_PORT", "3001"))
API_SECRET = os.getenv("API_SECRET", "")

BASE_URL = (
    "https://mainnet.zklighter.elliot.ai"
    if LIGHTER_ENVIRONMENT == "mainnet"
    else "https://testnet.zklighter.elliot.ai"
)

# Lighter client (initialized on demand)
_client = None
_order_api = None
_account_api = None


def get_client():
    """Get Lighter SignerClient, initializing if necessary."""
    global _client
    if _client is None:
        try:
            import lighter
            from lighter import nonce_manager

            _client = lighter.SignerClient(
                url=BASE_URL,
                api_private_keys={LIGHTER_API_KEY_INDEX: LIGHTER_API_KEY},
                account_index=LIGHTER_ACCOUNT_INDEX,
                nonce_management_type=nonce_manager.NonceManagerType.OPTIMISTIC,
            )
            err = _client.check_client()
            if err:
                raise Exception(f"Client verification error: {err}")
            logger.info("Lighter SignerClient initialized successfully")
        except ImportError:
            raise Exception("lighter not installed. Run: pip install zklighter")
    return _client


def get_order_api():
    """Get Lighter OrderApi for read operations."""
    global _order_api
    if _order_api is None:
        import lighter

        api_client = lighter.ApiClient(
            configuration=lighter.Configuration(host=BASE_URL)
        )
        _order_api = lighter.OrderApi(api_client)
    return _order_api


def get_account_api():
    """Get Lighter AccountApi for read operations."""
    global _account_api
    if _account_api is None:
        import lighter

        api_client = lighter.ApiClient(
            configuration=lighter.Configuration(host=BASE_URL)
        )
        _account_api = lighter.AccountApi(api_client)
    return _account_api


def create_auth_token():
    """Get a fresh auth token for authenticated API calls."""
    client = get_client()
    token, err = client.create_auth_token_with_expiry(deadline=600)
    if err:
        raise Exception(f"Failed to create auth token: {err}")
    return token


# Market decimals cache
_market_decimals = {}


async def get_market_decimals(market_index: int) -> tuple:
    """Get size and price decimals for a market."""
    global _market_decimals
    if market_index not in _market_decimals:
        import aiohttp

        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BASE_URL}/api/v1/orderBooks") as resp:
                data = await resp.json()
                for ob in data.get("order_books", []):
                    mid = ob.get("market_id")
                    size_dec = ob.get("supported_size_decimals", 4)
                    price_dec = ob.get("supported_price_decimals", 2)
                    _market_decimals[mid] = (size_dec, price_dec)

    return _market_decimals.get(market_index, (4, 2))


def convert_size_to_base_amount(size: float, size_decimals: int) -> int:
    """Convert human-readable size to base amount (integer)."""
    return int(size * (10 ** size_decimals))


def convert_price_to_int(price: float, price_decimals: int) -> int:
    """Convert human-readable price to integer."""
    return int(price * (10 ** price_decimals))


def async_route(f):
    """Decorator for async routes."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        return asyncio.run(f(*args, **kwargs))

    return wrapper


def require_auth(f):
    """Decorator to require API_SECRET authentication."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        if API_SECRET:
            auth_header = request.headers.get("X-API-Secret", "")
            if auth_header != API_SECRET:
                return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)

    return wrapper


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "environment": LIGHTER_ENVIRONMENT,
            "account_index": LIGHTER_ACCOUNT_INDEX,
            "base_url": BASE_URL,
            "timestamp": int(time.time() * 1000),
        }
    )


@app.route("/api/info", methods=["GET"])
def get_info():
    return jsonify(
        {
            "environment": LIGHTER_ENVIRONMENT,
            "account_index": LIGHTER_ACCOUNT_INDEX,
            "api_key_index": LIGHTER_API_KEY_INDEX,
            "base_url": BASE_URL,
            "auth_required": bool(API_SECRET),
        }
    )


@app.route("/api/order/limit", methods=["POST"])
@require_auth
@async_route
async def create_limit_order():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400

        client = get_client()

        market_index = int(data.get("market_index", 0))
        side = data.get("side", "buy").lower()
        size = float(data.get("size", 0))
        price = float(data.get("price", 0))
        reduce_only = bool(data.get("reduce_only", False))
        post_only = bool(data.get("post_only", False))
        client_order_id = int(data.get("client_order_id", 0)) or int(time.time() * 1000)

        if size <= 0:
            return jsonify({"error": "size must be > 0"}), 400
        if price <= 0:
            return jsonify({"error": "price must be > 0 for limit orders"}), 400

        is_ask = side == "sell"

        # Get market decimals for proper conversion
        size_dec, price_dec = await get_market_decimals(market_index)
        base_amount = convert_size_to_base_amount(size, size_dec)
        price_int = convert_price_to_int(price, price_dec)

        time_in_force = (
            client.ORDER_TIME_IN_FORCE_POST_ONLY
            if post_only
            else client.ORDER_TIME_IN_FORCE_GOOD_TILL_TIME
        )

        tx, response, err = await client.create_order(
            market_index=market_index,
            client_order_index=client_order_id,
            base_amount=base_amount,
            price=price_int,
            is_ask=is_ask,
            order_type=client.ORDER_TYPE_LIMIT,
            time_in_force=time_in_force,
            reduce_only=reduce_only,
        )

        if err:
            return jsonify({"success": False, "error": err}), 400

        return jsonify(
            {
                "success": True,
                "tx_hash": response.tx_hash if response else None,
                "order": {
                    "market_index": market_index,
                    "side": side,
                    "size": size,
                    "price": price,
                    "type": "limit",
                },
            }
        )

    except Exception as e:
        logger.exception("Error creating limit order")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/order/market", methods=["POST"])
@require_auth
@async_route
async def create_market_order():
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
        reduce_only = bool(data.get("reduce_only", False))
        client_order_id = int(data.get("client_order_id", 0)) or int(time.time() * 1000)

        if size <= 0:
            return jsonify({"error": "size must be > 0"}), 400

        orderbook = await order_api.order_book_orders(
            market_id=market_index, limit=1
        )

        is_ask = side == "sell"

        if is_ask and orderbook.bids:
            current_price = float(orderbook.bids[0].price)
        elif not is_ask and orderbook.asks:
            current_price = float(orderbook.asks[0].price)
        else:
            return jsonify({"error": "Could not get current price"}), 400

        slippage_multiplier = (1 - slippage) if is_ask else (1 + slippage)
        execution_price = current_price * slippage_multiplier

        # Get market decimals for proper conversion
        size_dec, price_dec = await get_market_decimals(market_index)
        base_amount = convert_size_to_base_amount(size, size_dec)
        price_int = convert_price_to_int(execution_price, price_dec)

        tx, response, err = await client.create_order(
            market_index=market_index,
            client_order_index=client_order_id,
            base_amount=base_amount,
            price=price_int,
            is_ask=is_ask,
            order_type=client.ORDER_TYPE_MARKET,
            time_in_force=client.ORDER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
            reduce_only=reduce_only,
            order_expiry=client.DEFAULT_IOC_EXPIRY,
        )

        if err:
            return jsonify({"success": False, "error": err}), 400

        return jsonify(
            {
                "success": True,
                "tx_hash": response.tx_hash if response else None,
                "order": {
                    "market_index": market_index,
                    "side": side,
                    "size": size,
                    "execution_price": execution_price,
                    "type": "market",
                },
            }
        )

    except Exception as e:
        logger.exception("Error creating market order")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/order/cancel", methods=["POST"])
@require_auth
@async_route
async def cancel_order():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400

        client = get_client()

        market_index = int(data.get("market_index", 0))
        order_index = int(data.get("order_index", 0))

        if order_index <= 0:
            return jsonify({"error": "order_index is required"}), 400

        tx, response, err = await client.cancel_order(
            market_index=market_index,
            order_index=order_index,
        )

        if err:
            return jsonify({"success": False, "error": err}), 400

        return jsonify(
            {
                "success": True,
                "tx_hash": response.tx_hash if response else None,
                "cancelled": {"market_index": market_index, "order_index": order_index},
            }
        )

    except Exception as e:
        logger.exception("Error cancelling order")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/order/cancel-all", methods=["POST"])
@require_auth
@async_route
async def cancel_all_orders():
    try:
        data = request.get_json() or {}
        client = get_client()
        order_api = get_order_api()

        market_index = data.get("market_index")

        auth_token = create_auth_token()
        active_orders = await order_api.account_active_orders(
            account_index=LIGHTER_ACCOUNT_INDEX,
            market_id=market_index if market_index is not None else -1,
            auth=auth_token,
        )

        orders = active_orders.orders or []
        if not orders:
            return jsonify(
                {
                    "success": True,
                    "message": "No orders to cancel",
                    "cancelled_count": 0,
                }
            )

        cancelled = []
        errors = []

        for order in orders:
            try:
                _, response, err = await client.cancel_order(
                    market_index=getattr(order, "market_index", market_index or 0),
                    order_index=order.order_index,
                )
                if err:
                    errors.append({"order_index": order.order_index, "error": err})
                else:
                    cancelled.append(order.order_index)
            except Exception as e:
                errors.append({"order_index": order.order_index, "error": str(e)})

        return jsonify(
            {
                "success": len(errors) == 0,
                "cancelled_count": len(cancelled),
                "cancelled_orders": cancelled,
                "errors": errors if errors else None,
            }
        )

    except Exception as e:
        logger.exception("Error cancelling all orders")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/position/close", methods=["POST"])
@require_auth
@async_route
async def close_position():
    try:
        data = request.get_json() or {}
        client = get_client()
        account_api = get_account_api()
        order_api = get_order_api()

        market_index = int(data.get("market_index", 0))
        slippage = float(data.get("slippage", 0.5)) / 100

        response = await account_api.account(by="index", value=str(LIGHTER_ACCOUNT_INDEX))

        position = None
        # Response is DetailedAccounts with accounts list
        accounts = getattr(response, "accounts", []) or []
        positions = []
        for account in accounts:
            positions.extend(getattr(account, "positions", []) or [])
        for p in positions:
            p_market = getattr(p, "market_index", getattr(p, "market_id", None))
            if p_market == market_index:
                position = p
                break

        if not position:
            return jsonify(
                {
                    "success": True,
                    "message": "No position to close",
                    "market_index": market_index,
                }
            )

        position_size = abs(
            float(getattr(position, "position", getattr(position, "size", 0)))
        )
        is_long = getattr(position, "sign", 0) > 0

        if position_size <= 0:
            return jsonify({"success": True, "message": "Position already closed"})

        orderbook = await order_api.order_book_orders(
            market_id=market_index, limit=1
        )

        is_ask = is_long

        if is_ask and orderbook.bids:
            current_price = float(orderbook.bids[0].price)
        elif not is_ask and orderbook.asks:
            current_price = float(orderbook.asks[0].price)
        else:
            return jsonify({"error": "Could not get price for close"}), 400

        slippage_multiplier = (1 - slippage) if is_ask else (1 + slippage)
        execution_price = current_price * slippage_multiplier

        # Get market decimals for proper conversion
        size_dec, price_dec = await get_market_decimals(market_index)
        base_amount = convert_size_to_base_amount(position_size, size_dec)
        price_int = convert_price_to_int(execution_price, price_dec)

        tx, response, err = await client.create_order(
            market_index=market_index,
            client_order_index=int(time.time() * 1000),
            base_amount=base_amount,
            price=price_int,
            is_ask=is_ask,
            order_type=client.ORDER_TYPE_MARKET,
            time_in_force=client.ORDER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
            reduce_only=True,
            order_expiry=client.DEFAULT_IOC_EXPIRY,
        )

        if err:
            return jsonify({"success": False, "error": err}), 400

        return jsonify(
            {
                "success": True,
                "tx_hash": response.tx_hash if response else None,
                "closed_position": {
                    "market_index": market_index,
                    "size": position_size,
                    "side": "long" if is_long else "short",
                },
            }
        )

    except Exception as e:
        logger.exception("Error closing position")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/position/update-leverage", methods=["POST"])
@require_auth
@async_route
async def update_leverage():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400

        client = get_client()

        market_index = int(data.get("market_index", 0))
        leverage = int(data.get("leverage", 10))
        margin_mode = data.get("margin_mode", "cross").lower()

        if leverage < 1 or leverage > 100:
            return jsonify({"error": "leverage must be between 1 and 100"}), 400

        fraction = leverage * 100
        mode = (
            client.CROSS_MARGIN_MODE
            if margin_mode == "cross"
            else client.ISOLATED_MARGIN_MODE
        )

        tx, response, err = await client.update_leverage(
            market_index=market_index,
            fraction=fraction,
            margin_mode=mode,
        )

        if err:
            return jsonify({"success": False, "error": err}), 400

        return jsonify(
            {
                "success": True,
                "tx_hash": response.tx_hash if response else None,
                "leverage": {
                    "market_index": market_index,
                    "leverage": leverage,
                    "margin_mode": margin_mode,
                },
            }
        )

    except Exception as e:
        logger.exception("Error updating leverage")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/account", methods=["GET"])
@require_auth
@async_route
async def get_account():
    try:
        account_api = get_account_api()
        account = await account_api.account(by="index", value=str(LIGHTER_ACCOUNT_INDEX))
        return jsonify(account.model_dump())
    except Exception as e:
        logger.exception("Error getting account")
        return jsonify({"error": str(e)}), 500


@app.route("/api/positions", methods=["GET"])
@require_auth
@async_route
async def get_positions():
    try:
        account_api = get_account_api()
        response = await account_api.account(by="index", value=str(LIGHTER_ACCOUNT_INDEX))

        positions = []
        # Response is DetailedAccounts with accounts list
        accounts = getattr(response, "accounts", []) or []
        for account in accounts:
            account_positions = getattr(account, "positions", []) or []
            for p in account_positions:
                pos_size = float(getattr(p, "position", getattr(p, "size", 0)))
                if pos_size != 0:
                    positions.append(
                        {
                            "market_index": getattr(
                                p, "market_index", getattr(p, "market_id", 0)
                            ),
                            "size": abs(pos_size),
                            "side": "long" if pos_size > 0 else "short",
                        }
                    )

        return jsonify({"positions": positions, "count": len(positions)})
    except Exception as e:
        logger.exception("Error getting positions")
        return jsonify({"error": str(e)}), 500


@app.route("/api/orders", methods=["GET"])
@require_auth
@async_route
async def get_orders():
    try:
        order_api = get_order_api()
        market_index = request.args.get("market_index", type=int, default=-1)

        auth_token = create_auth_token()
        active_orders = await order_api.account_active_orders(
            account_index=LIGHTER_ACCOUNT_INDEX,
            market_id=market_index,
            auth=auth_token,
        )

        orders = []
        for o in active_orders.orders or []:
            orders.append(
                {
                    "order_index": o.order_index,
                    "market_index": getattr(o, "market_index", 0),
                    "side": "sell" if getattr(o, "is_ask", False) else "buy",
                    "size": float(
                        getattr(o, "remaining_base_amount", o.initial_base_amount)
                    ),
                    "price": float(o.price),
                }
            )

        return jsonify({"orders": orders, "count": len(orders)})
    except Exception as e:
        logger.exception("Error getting orders")
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth-token", methods=["GET"])
@require_auth
@async_route
async def get_auth_token():
    try:
        client = get_client()
        expiry = request.args.get("expiry", type=int, default=3600)

        token, err = client.create_auth_token_with_expiry(expiry)

        if err:
            return jsonify({"error": err}), 400

        return jsonify({"token": token, "expires_in": expiry})
    except Exception as e:
        logger.exception("Error generating auth token")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    if not LIGHTER_API_KEY:
        print("WARNING: LIGHTER_API_KEY not configured!")

    print(f"\nLighter Trading Backend")
    print(f"Environment: {LIGHTER_ENVIRONMENT}")
    print(f"Account Index: {LIGHTER_ACCOUNT_INDEX}")
    print(f"Port: {FLASK_PORT}\n")

    app.run(host="0.0.0.0", port=FLASK_PORT, debug=False)
