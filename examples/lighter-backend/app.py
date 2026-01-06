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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
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
            import zklighter
            from zklighter import nonce_manager

            _client = zklighter.SignerClient(
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
            raise Exception("lighter-sdk not installed. Run: pip install lighter-sdk")
    return _client


def get_order_api():
    """Get Lighter OrderApi for read operations."""
    global _order_api
    if _order_api is None:
        import zklighter
        api_client = zklighter.ApiClient(
            configuration=zklighter.Configuration(host=BASE_URL)
        )
        _order_api = zklighter.OrderApi(api_client)
    return _order_api


def get_account_api():
    """Get Lighter AccountApi for read operations."""
    global _account_api
    if _account_api is None:
        import zklighter
        api_client = zklighter.ApiClient(
            configuration=zklighter.Configuration(host=BASE_URL)
        )
        _account_api = zklighter.AccountApi(api_client)
    return _account_api


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
    return jsonify({
        "status": "ok",
        "environment": LIGHTER_ENVIRONMENT,
        "account_index": LIGHTER_ACCOUNT_INDEX,
        "base_url": BASE_URL,
        "timestamp": int(time.time() * 1000),
    })


@app.route("/api/info", methods=["GET"])
def get_info():
    return jsonify({
        "environment": LIGHTER_ENVIRONMENT,
        "account_index": LIGHTER_ACCOUNT_INDEX,
        "api_key_index": LIGHTER_API_KEY_INDEX,
        "base_url": BASE_URL,
        "auth_required": bool(API_SECRET),
    })


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
        base_amount = int(size * 10000)
        price_int = int(price * 100)

        time_in_force = (
            client.ORDER_TIME_IN_FORCE_POST_ONLY if post_only
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

        return jsonify({
            "success": True,
            "tx_hash": response.tx_hash if response else None,
            "order": {
                "market_index": market_index,
                "side": side,
                "size": size,
                "price": price,
                "type": "limit",
            },
        })

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

        orderbook = await order_api.order_book_orders(market_index=market_index, limit=1)
        
        is_ask = side == "sell"
        
        if is_ask and orderbook.bids:
            current_price = float(orderbook.bids[0].price)
        elif not is_ask and orderbook.asks:
            current_price = float(orderbook.asks[0].price)
        else:
            return jsonify({"error": "Could not get current price"}), 400

        slippage_multiplier = (1 - slippage) if is_ask else (1 + slippage)
        execution_price = current_price * slippage_multiplier

        base_amount = int(size * 10000)
        price_int = int(execution_price * 100)

        tx, response, err = await client.create_order(
            market_index=market_index,
            client_order_index=client_order_id,
            base_amount=base_amount,
            price=price_int,
            is_ask=is_ask,
            order_type=client.ORDER_TYPE_MARKET,
            time_in_force=client.ORDER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
            reduce_only=reduce_only,
       
