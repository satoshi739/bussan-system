"""
価格取得モジュール
- eBay: Browse API（OAuth、App ID + Cert ID が必要、無料）
- メルカリ: 内部API（APIキー不要）
- Amazon: スクレイピング（不安定）またはKeepa API（有料）
"""

import base64
import logging
import os
import re
import time
import requests
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

_ebay_token_cache: Dict[str, Tuple[str, float]] = {}

HEADERS_PC = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'ja-JP,ja;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

HEADERS_SP = {
    'User-Agent': (
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) '
        'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    ),
    'Accept-Language': 'ja-JP,ja;q=0.9',
}


def _get_settings() -> Dict:
    try:
        from database import Database
        db = Database()
        try:
            return db.get_settings()
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"設定読み込み失敗: {e}")
        return {}


# ===== eBay =====

def _get_ebay_credentials() -> Tuple[str, str, str]:
    """環境変数優先・DB settings フォールバックで eBay 認証情報を取得"""
    env = (os.getenv('EBAY_ENV') or 'SANDBOX').strip().upper()
    app_id = (os.getenv('EBAY_APP_ID') or '').strip()
    cert_id = (os.getenv('EBAY_CERT_ID') or '').strip()

    if not app_id or not cert_id:
        settings = _get_settings()
        if not app_id:
            app_id = (settings.get('ebay_app_id') or '').strip()
        if not cert_id:
            cert_id = (settings.get('ebay_cert_id') or '').strip()
        if not env or env == 'SANDBOX':
            env = (settings.get('ebay_env') or env or 'SANDBOX').strip().upper()

    return env, app_id, cert_id


def _ebay_api_base(env: str) -> str:
    return 'https://api.sandbox.ebay.com' if env == 'SANDBOX' else 'https://api.ebay.com'


def _get_ebay_token() -> Optional[str]:
    """OAuth client_credentials トークンを取得（2時間キャッシュ）"""
    env, app_id, cert_id = _get_ebay_credentials()
    if not app_id or not cert_id:
        return None

    cached = _ebay_token_cache.get(env)
    if cached and cached[1] > time.time() + 60:
        return cached[0]

    try:
        creds = f'{app_id}:{cert_id}'
        b64 = base64.b64encode(creds.encode()).decode()
        resp = requests.post(
            f'{_ebay_api_base(env)}/identity/v1/oauth2/token',
            headers={
                'Authorization': f'Basic {b64}',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data={
                'grant_type': 'client_credentials',
                'scope': 'https://api.ebay.com/oauth/api_scope',
            },
            timeout=10,
        )
        if resp.status_code != 200:
            logger.warning(f'[eBay] OAuth トークン取得失敗: {resp.status_code} {resp.text[:200]}')
            return None
        data = resp.json()
        token = data.get('access_token')
        if not token:
            return None
        expires_at = time.time() + float(data.get('expires_in', 7200))
        _ebay_token_cache[env] = (token, expires_at)
        return token
    except Exception as e:
        logger.warning(f'[eBay] OAuth エラー: {e}')
        return None


def _build_ebay_filter(
    min_price: Optional[float],
    max_price: Optional[float],
    condition: Optional[str],
    buying_options: str,
) -> str:
    parts = [f'buyingOptions:{{{buying_options}}}']

    if min_price is not None or max_price is not None:
        lo = '' if min_price is None else str(min_price)
        hi = '' if max_price is None else str(max_price)
        parts.append(f'price:[{lo}..{hi}],priceCurrency:USD')

    if condition:
        cond_map = {
            'new': 'NEW',
            'used': 'USED',
            'refurbished': 'CERTIFIED_REFURBISHED|SELLER_REFURBISHED',
            'unspecified': 'UNSPECIFIED',
        }
        cond_val = cond_map.get(condition.lower(), condition.upper())
        parts.append(f'conditions:{{{cond_val}}}')

    return ','.join(parts)


def search_ebay(
    keyword: str,
    limit: int = 10,
    *,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
    marketplace: str = 'EBAY_US',
    buying_options: str = 'FIXED_PRICE',
) -> List[Dict]:
    """eBay Browse API で出品中商品を検索

    Args:
        keyword: 検索キーワード
        limit: 最大取得件数（1-200）
        min_price: 価格下限（USD）
        max_price: 価格上限（USD）
        condition: 'new' | 'used' | 'refurbished' | 'unspecified'
        marketplace: 'EBAY_US' | 'EBAY_GB' | 'EBAY_DE' | 'EBAY_AU' | etc.
        buying_options: 'FIXED_PRICE' | 'AUCTION' | 'FIXED_PRICE|AUCTION'
    """
    token = _get_ebay_token()
    if not token:
        logger.warning('eBay APIキー未設定または認証失敗')
        return []

    env, _, _ = _get_ebay_credentials()
    settings = _get_settings()
    usd_jpy = float(settings.get('usd_jpy', 150))

    try:
        resp = requests.get(
            f'{_ebay_api_base(env)}/buy/browse/v1/item_summary/search',
            headers={
                'Authorization': f'Bearer {token}',
                'X-EBAY-C-MARKETPLACE-ID': marketplace,
                'Content-Type': 'application/json',
            },
            params={
                'q': keyword,
                'limit': min(max(int(limit), 1), 200),
                'sort': 'price',
                'filter': _build_ebay_filter(min_price, max_price, condition, buying_options),
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        items = data.get('itemSummaries') or []
        results = []
        for it in items:
            try:
                price_info = it.get('price') or {}
                price_usd = float(price_info.get('value') or 0)

                ship_usd = 0.0
                ship_options = it.get('shippingOptions') or []
                if ship_options:
                    ship_cost = ship_options[0].get('shippingCost') or {}
                    ship_usd = float(ship_cost.get('value') or 0)

                image_obj = it.get('image') or {}
                image_url = image_obj.get('imageUrl') or ''
                if not image_url:
                    thumbs = it.get('thumbnailImages') or []
                    if thumbs:
                        image_url = thumbs[0].get('imageUrl') or ''

                results.append({
                    'item_id': it.get('itemId') or '',
                    'title': it.get('title') or '',
                    'price_usd': price_usd,
                    'shipping_usd': ship_usd,
                    'price_jpy': round(price_usd * usd_jpy),
                    'shipping_jpy': round(ship_usd * usd_jpy),
                    'total_jpy': round((price_usd + ship_usd) * usd_jpy),
                    'condition': it.get('condition') or '',
                    'url': it.get('itemWebUrl') or '',
                    'image': image_url,
                })
            except Exception as e:
                logger.warning(f'[eBay] アイテムのパースに失敗: {e}')
                continue

        return results

    except Exception as e:
        logger.warning(f'[eBay] エラー: {e}')
        return []


def get_ebay_item(item_id: str, marketplace: str = 'EBAY_US') -> Optional[Dict]:
    """eBay Browse API で商品の詳細情報を取得"""
    if not item_id:
        return None

    token = _get_ebay_token()
    if not token:
        return None

    env, _, _ = _get_ebay_credentials()
    settings = _get_settings()
    usd_jpy = float(settings.get('usd_jpy', 150))

    try:
        resp = requests.get(
            f'{_ebay_api_base(env)}/buy/browse/v1/item/{item_id}',
            headers={
                'Authorization': f'Bearer {token}',
                'X-EBAY-C-MARKETPLACE-ID': marketplace,
                'Content-Type': 'application/json',
            },
            timeout=10,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        it = resp.json()

        price_info = it.get('price') or {}
        price_usd = float(price_info.get('value') or 0)

        ship_usd = 0.0
        ship_options = it.get('shippingOptions') or []
        if ship_options:
            ship_cost = ship_options[0].get('shippingCost') or {}
            ship_usd = float(ship_cost.get('value') or 0)

        ship_to_obj = it.get('shipToLocations') or {}
        if isinstance(ship_to_obj, dict):
            ship_to = [
                (reg or {}).get('regionName', '')
                for reg in (ship_to_obj.get('regionIncluded') or [])
            ]
        else:
            ship_to = []

        seller = it.get('seller') or {}
        image_obj = it.get('image') or {}
        image_url = image_obj.get('imageUrl') or ''
        additional_images = [
            img.get('imageUrl') or '' for img in (it.get('additionalImages') or [])
        ]

        return {
            'item_id': it.get('itemId') or item_id,
            'title': it.get('title') or '',
            'description': it.get('shortDescription') or it.get('description') or '',
            'price_usd': price_usd,
            'shipping_usd': ship_usd,
            'price_jpy': round(price_usd * usd_jpy),
            'shipping_jpy': round(ship_usd * usd_jpy),
            'total_jpy': round((price_usd + ship_usd) * usd_jpy),
            'condition': it.get('condition') or '',
            'condition_id': it.get('conditionId') or '',
            'url': it.get('itemWebUrl') or '',
            'image': image_url,
            'images': [u for u in additional_images if u],
            'seller_username': seller.get('username') or '',
            'seller_feedback_score': seller.get('feedbackScore'),
            'seller_feedback_pct': seller.get('feedbackPercentage'),
            'item_location': (it.get('itemLocation') or {}).get('country') or '',
            'ship_to_regions': ship_to,
            'brand': it.get('brand') or '',
            'mpn': it.get('mpn') or '',
            'category_path': it.get('categoryPath') or '',
        }

    except Exception as e:
        logger.warning(f'[eBay] 商品詳細取得エラー (item_id={item_id}): {e}')
        return None


# ===== eBay 落札済み =====

def search_ebay_sold(keyword: str, limit: int = 10) -> List[Dict]:
    """eBayの落札済み商品（実売価格）をスクレイピングして返す"""
    try:
        from bs4 import BeautifulSoup
        import urllib.parse
    except ImportError:
        return []

    try:
        settings = _get_settings()
        usd_jpy = float(settings.get('usd_jpy', 150))

        encoded = urllib.parse.quote(keyword)
        url = f"https://www.ebay.com/sch/i.html?LH_Sold=1&LH_Complete=1&_nkw={encoded}"
        headers = {**HEADERS_PC, 'Accept-Language': 'en-US,en;q=0.9'}
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return []

        soup = BeautifulSoup(resp.text, 'html.parser')
        results = []

        for item in soup.select('.s-item')[:limit * 3]:
            title_el = item.select_one('.s-item__title')
            price_el = item.select_one('.s-item__price')
            link_el  = item.select_one('a.s-item__link')
            img_el   = item.select_one('.s-item__image img')
            date_el  = item.select_one('.s-item__ended-date, .s-item__listingDate, [class*="s-item__ended"]')

            if not title_el or not price_el:
                continue

            title = title_el.get_text(strip=True)
            # eBayのダミー行をスキップ
            if title in ('Shop on eBay', 'New Listing'):
                continue

            price_text = price_el.get_text(strip=True)
            # 価格範囲（"$10.00 to $20.00"）は最初の値を使う
            price_str = re.sub(r'[^\d.]', '', price_text.split(' to ')[0])
            if not price_str:
                continue
            try:
                price_usd = float(price_str)
            except ValueError:
                continue
            if price_usd <= 0:
                continue

            link = link_el['href'] if link_el and link_el.get('href') else ''
            img  = img_el.get('src', '') if img_el else ''
            sold_date = date_el.get_text(strip=True) if date_el else ''

            results.append({
                'title':     title,
                'price_usd': round(price_usd, 2),
                'price_jpy': round(price_usd * usd_jpy),
                'sold_date': sold_date,
                'url':       link,
                'image':     img,
                'source':    'eBay落札',
            })

            if len(results) >= limit:
                break

        return results

    except Exception as e:
        logger.warning(f'[eBay落札] エラー: {e}')
        return []


# ===== メルカリ =====

def _search_mercari_api(keyword: str, limit: int, status: str) -> List[Dict]:
    url = 'https://api.mercari.jp/v2/entities:search'
    headers = {
        **HEADERS_SP,
        'Content-Type': 'application/json',
        'X-Platform': 'web',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://jp.mercari.com',
        'Referer': 'https://jp.mercari.com/',
    }
    payload = {
        'userId': '',
        'pageSize': limit,
        'pageToken': '',
        'searchSessionId': '',
        'indexRouting': 'INDEX_ROUTING_UNSPECIFIED',
        'thumbnailTypes': [],
        'searchCondition': {
            'keyword': keyword,
            'excludeKeyword': '',
            'sort': 'SORT_CREATED_TIME',
            'order': 'ORDER_DESC',
            'status': [status],
            'categoryId': [],
            'brandId': [],
            'sellerId': [],
            'priceMin': 0,
            'priceMax': 0,
            'itemConditionId': [],
            'shippingPayerId': [],
            'shippingFromArea': [],
            'shippingMethod': [],
            'colorId': [],
            'hasCoupon': False,
            'attributes': [],
            'itemTypes': [],
            'skuIds': [],
        },
        'defaultDatasets': ['DATASET_TYPE_MERCARI', 'DATASET_TYPE_BEYOND'],
        'serviceFrom': 'suruga',
        'withItemBrand': True,
        'withItemSize': False,
        'withItemPromotions': False,
        'withItemSizes': False,
        'useDynamicAttribute': False,
        'withSuggestedItems': False,
        'lang': 'ja',
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=10)
    if resp.status_code != 200:
        logger.warning(f'[メルカリ] status={resp.status_code}')
        return []
    items = resp.json().get('items', [])
    results = []
    for item in items:
        results.append({
            'id': item.get('id', ''),
            'name': item.get('name', ''),
            'price': item.get('price', 0),
            'condition': item.get('itemCondition', {}).get('name', ''),
            'url': f"https://jp.mercari.com/item/{item.get('id', '')}",
            'image': (item.get('thumbnails') or [''])[0],
            'source': 'メルカリ',
        })
    return results


def search_mercari(keyword: str, limit: int = 10) -> List[Dict]:
    """メルカリの販売中商品を検索する"""
    try:
        return _search_mercari_api(keyword, limit, 'STATUS_ON_SALE')
    except Exception as e:
        logger.warning(f'[メルカリ] エラー: {e}')
        return []


def search_mercari_sold(keyword: str, limit: int = 10) -> List[Dict]:
    """メルカリの売り切れ商品（実売価格）を検索する"""
    try:
        return _search_mercari_api(keyword, limit, 'STATUS_SOLD_OUT')
    except Exception as e:
        logger.warning(f'[メルカリ sold] エラー: {e}')
        return []


# ===== Amazon =====

def get_amazon_price(keyword: str, limit: int = 5) -> List[Dict]:
    settings = _get_settings()
    keepa_key = settings.get('keepa_api_key', '').strip()

    if keepa_key:
        return _search_keepa(keyword, keepa_key, limit)
    else:
        return _search_amazon_scrape(keyword, limit)


def _search_keepa(keyword: str, api_key: str, limit: int) -> List[Dict]:
    try:
        url = 'https://api.keepa.com/search'
        params = {
            'key': api_key,
            'domain': 5,  # Amazon.co.jp
            'type': 'product',
            'term': keyword,
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        products = resp.json().get('products', [])

        results = []
        for product in products[:limit]:
            csv_data = product.get('csv', [])
            price = 0
            if csv_data and len(csv_data) > 0 and csv_data[0]:
                prices = csv_data[0]
                if prices and len(prices) >= 2:
                    price = prices[-1] / 100

            asin = product.get('asin', '')
            results.append({
                'asin': asin,
                'title': product.get('title', ''),
                'price': price,
                'url': f'https://www.amazon.co.jp/dp/{asin}',
            })

        return results

    except Exception as e:
        logger.warning(f'[Keepa] エラー: {e}')
        return []


def _keepa_market_price(keyword: str, api_key: str, limit: int = 10) -> Dict:
    """Keepa API で Amazon.co.jp の実売相場統計を返す。"""
    items = _search_keepa(keyword, api_key, limit)
    prices = [i['price'] for i in items if i.get('price', 0) > 0]
    if not prices:
        return {'found': False, 'keyword': keyword}

    prices.sort()
    n = len(prices)
    median = prices[n // 2] if n % 2 == 1 else (prices[n // 2 - 1] + prices[n // 2]) // 2

    return {
        'found': True,
        'keyword': keyword,
        'median_price': median,
        'avg_price': round(sum(prices) / n),
        'min_price': prices[0],
        'max_price': prices[-1],
        'sample_count': n,
        'items': [{'name': i['title'], 'price': i['price'], 'url': i['url'],
                   'source': 'Amazon(Keepa)'} for i in items[:3]],
        'source': 'Keepa',
    }


# ===== Yahoo!オークション =====

def search_yahoo_auction(keyword: str, limit: int = 10) -> List[Dict]:
    """Yahoo!オークションを検索（スクレイピング）"""
    try:
        from bs4 import BeautifulSoup
        import urllib.parse
        encoded = urllib.parse.quote(keyword)
        url = f"https://auctions.yahoo.co.jp/search/search?p={encoded}&auccat=&tab_ex=commerce&ei=UTF-8"
        resp = requests.get(url, headers=HEADERS_PC, timeout=10)
        if resp.status_code != 200:
            return []

        soup = BeautifulSoup(resp.text, 'html.parser')
        results = []

        for item in soup.select('li.Product')[:limit * 2]:
            title_el  = item.select_one('.Product__title')
            price_el  = item.select_one('.Product__priceValue')
            link_el   = item.select_one('a.Product__imageLink, a.Product__titleLink, h3 a')
            img_el    = item.select_one('img')
            if not title_el or not price_el:
                continue
            title = title_el.get_text(strip=True)
            price_str = re.sub(r'[^\d]', '', price_el.get_text())
            price = int(price_str) if price_str else 0
            link  = link_el['href'] if link_el and link_el.get('href') else ''
            img   = img_el.get('src', '') if img_el else ''
            # 1円スタート・明らかなジャンク品は除外（200円未満）
            if price >= 200:
                results.append({'name': title, 'price': price, 'url': link, 'image': img,
                                 'condition': '', 'source': 'Yahoo!オークション'})
            if len(results) >= limit:
                break

        return results
    except ImportError:
        return []
    except Exception as e:
        print(f'[Yahoo!オークション] エラー: {e}')
        return []


# ===== PayPayフリマ =====

def search_paypay_flea(keyword: str, limit: int = 10) -> List[Dict]:
    """PayPayフリマを検索（スクレイピング）"""
    try:
        from bs4 import BeautifulSoup
        import urllib.parse
        encoded = urllib.parse.quote(keyword)
        url = f"https://paypayfleamarket.yahoo.co.jp/search/{encoded}"
        headers = {**HEADERS_SP, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, 'html.parser')
        results = []
        # PayPayフリマのアイテムカード
        for item in soup.select('[class*="ItemCard"], [data-testid="item-cell"]')[:limit * 2]:
            title_el = item.select_one('[class*="title"], [class*="name"], p')
            price_el = item.select_one('[class*="price"], [class*="Price"]')
            link_el  = item.select_one('a')
            img_el   = item.select_one('img')
            if not title_el or not price_el:
                continue
            title = title_el.get_text(strip=True)
            price_str = re.sub(r'[^\d]', '', price_el.get_text())
            price = int(price_str) if price_str else 0
            href = link_el['href'] if link_el and link_el.get('href') else ''
            if href and not href.startswith('http'):
                href = 'https://paypayfleamarket.yahoo.co.jp' + href
            img = img_el.get('src', '') if img_el else ''
            if price > 0:
                results.append({'name': title, 'price': price, 'url': href, 'image': img,
                                 'condition': '', 'source': 'PayPayフリマ'})
            if len(results) >= limit:
                break
        return results
    except ImportError:
        return []
    except Exception as e:
        print(f'[PayPayフリマ] エラー: {e}')
        return []


# ===== ラクマ =====

def search_rakuma(keyword: str, limit: int = 10) -> List[Dict]:
    """ラクマを検索（内部API）"""
    try:
        import urllib.parse
        encoded = urllib.parse.quote(keyword)
        url = f"https://api.fril.jp/v2/items/search?keyword={encoded}&per_page={limit}&status=on_sale"
        headers = {
            'User-Agent': HEADERS_SP['User-Agent'],
            'Accept': 'application/json',
            'Origin': 'https://fril.jp',
            'Referer': 'https://fril.jp/',
        }
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return []
        items = resp.json().get('items', [])
        results = []
        for item in items[:limit]:
            price = item.get('price', 0)
            if price > 0:
                results.append({
                    'name': item.get('name', ''),
                    'price': price,
                    'url': f"https://fril.jp/item/{item.get('id', '')}",
                    'image': item.get('item_image', {}).get('medium', ''),
                    'condition': item.get('item_condition', {}).get('name', ''),
                    'source': 'ラクマ',
                })
        return results
    except Exception as e:
        print(f'[ラクマ] エラー: {e}')
        return []


# ===== ヤフーショッピング =====

def search_yahoo_shopping(keyword: str, limit: int = 10) -> List[Dict]:
    """Yahoo!ショッピングを検索（トラッキング文字列から価格抽出）"""
    try:
        from bs4 import BeautifulSoup
        import urllib.parse
        encoded = urllib.parse.quote(keyword)
        url = f"https://shopping.yahoo.co.jp/search?p={encoded}&n={limit * 2}&ei=UTF-8"
        resp = requests.get(url, headers=HEADERS_PC, timeout=10)
        if resp.status_code != 200:
            return []

        # トラッキング文字列から URL + 価格を抽出
        pattern = r'targurl:(store\.shopping\.yahoo\.co\.jp[^;]+);.*?(?:apld_prc|o_prc):(\d+);'
        matches = re.findall(pattern, resp.text)
        seen_urls = set()
        results = []

        # BeautifulSoup でタイトル・画像も取得
        soup = BeautifulSoup(resp.text, 'html.parser')

        for store_url, price_str in matches:
            full_url = f"https://{store_url}"
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)
            price = int(price_str)
            if price < 100:
                continue

            # URLから該当するaタグを探す
            link_el = soup.select_one(f'a[href*="{store_url[:50]}"]')
            if link_el:
                title = link_el.get_text(strip=True) or keyword
                img_el = link_el.find_parent().find('img') if link_el.find_parent() else None
                img = img_el.get('src', '') if img_el else ''
            else:
                title = keyword
                img = ''

            results.append({
                'name': title[:80],
                'price': price,
                'url': full_url,
                'image': img,
                'condition': '新品',
                'source': 'ヤフーショッピング',
            })
            if len(results) >= limit:
                break

        return results
    except Exception as e:
        print(f'[ヤフーショッピング] エラー: {e}')
        return []


# ===== Amazon.co.jp（セラー出品価格）=====

def _parse_amazon_price_to_jpy(price_str: str) -> int:
    """Amazon価格文字列をJPYに変換する。THB等の外貨も自動変換。"""
    if not price_str:
        return 0
    text = price_str.strip()
    # 通貨コードを判別
    if 'THB' in text or '฿' in text:
        try:
            from currency import get_rates
            rates = get_rates()
            thb_per_jpy = rates.get('THB', 0.238)
            amount = float(re.sub(r'[^\d.]', '', text))
            return round(amount / thb_per_jpy)
        except Exception:
            return 0
    # JPY (¥ or 数字のみ)
    digits = re.sub(r'[^\d]', '', text)
    return int(digits) if digits else 0


def search_amazon_jp(keyword: str, limit: int = 5) -> List[Dict]:
    """Amazon.co.jp を検索（スクレイピング）。THB等の外貨表示にも対応。"""
    try:
        from bs4 import BeautifulSoup
        url = f"https://www.amazon.co.jp/s?k={requests.utils.quote(keyword)}&language=ja"
        headers = {**HEADERS_PC, 'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'}
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200 or 'captcha' in resp.text.lower():
            return []
        soup = BeautifulSoup(resp.text, 'html.parser')
        results = []
        for product in soup.select('[data-asin]')[:limit * 3]:
            asin = product.get('data-asin', '').strip()
            if not asin:
                continue
            title_el = product.select_one('h2') or product.select_one('[data-cy*="title"]')
            price_el = product.select_one('.a-price .a-offscreen')
            if not title_el or not price_el:
                continue
            title = title_el.text.strip()
            price = _parse_amazon_price_to_jpy(price_el.text)
            if price > 0:
                results.append({
                    'name': title, 'price': price,
                    'url': f'https://www.amazon.co.jp/dp/{asin}',
                    'image': '', 'condition': '', 'source': 'Amazon.co.jp',
                })
            if len(results) >= limit:
                break
        return results
    except Exception as e:
        logger.warning(f'[Amazon.co.jp] エラー: {e}')
        return []


# ===== Amazon 実売価格取得 =====

def get_amazon_market_price(keyword: str) -> Dict:
    """
    Amazon.co.jpの実売価格を取得し、相場統計を返す。
    Keepa APIキーが設定されている場合はKeepa優先（CAPTCHAの影響なし）。
    未設定の場合はスクレイピングにフォールバック。
    """
    settings = _get_settings()
    keepa_key = settings.get('keepa_api_key', '').strip()

    if keepa_key:
        try:
            result = _keepa_market_price(keyword, keepa_key, limit=10)
            if result.get('found'):
                return result
        except Exception as e:
            logger.warning(f'[Keepa相場] エラー、スクレイピングにフォールバック: {e}')

    try:
        items = search_amazon_jp(keyword, limit=10)
        prices = [i['price'] for i in items if i.get('price', 0) > 0]
        if not prices:
            return {'found': False, 'keyword': keyword}

        prices.sort()
        n = len(prices)
        median = prices[n // 2] if n % 2 == 1 else (prices[n // 2 - 1] + prices[n // 2]) // 2

        return {
            'found': True,
            'keyword': keyword,
            'median_price': median,
            'avg_price': round(sum(prices) / n),
            'min_price': prices[0],
            'max_price': prices[-1],
            'sample_count': n,
            'items': items[:3],
            'source': 'scraping',
        }
    except Exception as e:
        logger.warning(f'[Amazon相場] エラー: {e}')
        return {'found': False, 'keyword': keyword}


# ===== 全サイト一括検索 =====

def search_all_buy_sites(keyword: str, limit: int = 5) -> List[Dict]:
    """メルカリ・ラクマ・ヤフオク・ヤフーショッピング・eBayをまとめて検索"""
    results = []

    # メルカリ（販売中）
    for item in search_mercari(keyword, limit):
        results.append({
            'source': '🛍️ メルカリ',
            'name':   item['name'],
            'price':  item['price'],
            'url':    item['url'],
            'image':  item.get('image', ''),
            'condition': item.get('condition', ''),
        })

    # メルカリ落札済み（実売価格 — 出品中より信頼性が高い）
    for item in search_mercari_sold(keyword, min(limit, 5)):
        results.append({
            'source':    '🛍️ メルカリ落札',
            'name':      item['name'],
            'price':     item['price'],
            'url':       item['url'],
            'image':     item.get('image', ''),
            'condition': '売り切れ',
        })

    # ラクマ
    for item in search_rakuma(keyword, limit):
        results.append({
            'source': '🌸 ラクマ',
            'name':   item['name'],
            'price':  item['price'],
            'url':    item['url'],
            'image':  item.get('image', ''),
            'condition': item.get('condition', ''),
        })

    # PayPayフリマ
    for item in search_paypay_flea(keyword, limit):
        results.append({
            'source': '💛 PayPayフリマ',
            'name':   item['name'],
            'price':  item['price'],
            'url':    item['url'],
            'image':  item.get('image', ''),
            'condition': item.get('condition', ''),
        })

    # Yahoo!オークション
    for item in search_yahoo_auction(keyword, limit):
        results.append({
            'source': '🔨 Yahoo!オークション',
            'name':   item['name'],
            'price':  item['price'],
            'url':    item['url'],
            'image':  item.get('image', ''),
            'condition': item.get('condition', ''),
        })

    # ヤフーショッピング
    for item in search_yahoo_shopping(keyword, limit):
        results.append({
            'source': '🟡 ヤフーショッピング',
            'name':   item['name'],
            'price':  item['price'],
            'url':    item['url'],
            'image':  item.get('image', ''),
            'condition': item.get('condition', '新品'),
        })

    # Amazon.co.jp（captcha回避できる場合のみ）
    for item in search_amazon_jp(keyword, limit):
        results.append({
            'source': '📦 Amazon.co.jp',
            'name':   item['name'],
            'price':  item['price'],
            'url':    item['url'],
            'image':  item.get('image', ''),
            'condition': item.get('condition', ''),
        })

    # eBay（APIキーがある場合のみ）
    for item in search_ebay(keyword, limit):
        results.append({
            'source': '🌏 eBay',
            'name':   item['title'],
            'price':  item['total_jpy'],
            'url':    item['url'],
            'image':  item.get('image', ''),
            'condition': item.get('condition', ''),
        })

    # eBay落札済み（実売価格 — 出品中より信頼性が高い）
    for item in search_ebay_sold(keyword, min(limit, 5)):
        results.append({
            'source':    '🌏 eBay落札',
            'name':      item['title'],
            'price':     item['price_jpy'],
            'url':       item['url'],
            'image':     item.get('image', ''),
            'condition': '落札済み',
        })

    results.sort(key=lambda x: x['price'])
    return results


def _search_amazon_scrape(keyword: str, limit: int) -> List[Dict]:
    try:
        from bs4 import BeautifulSoup
        url = f"https://www.amazon.co.jp/s?k={requests.utils.quote(keyword)}&language=ja"
        resp = requests.get(url, headers=HEADERS_PC, timeout=10)

        if resp.status_code != 200 or 'captcha' in resp.text.lower():
            return []

        soup = BeautifulSoup(resp.text, 'html.parser')
        results = []

        for product in soup.select('[data-asin]')[:limit * 2]:
            asin = product.get('data-asin', '').strip()
            if not asin:
                continue

            title_el = product.select_one('h2 a span')
            price_el = product.select_one('.a-price .a-offscreen')

            if not title_el:
                continue

            title = title_el.text.strip()
            price_str = price_el.text.strip() if price_el else ''
            price = int(re.sub(r'[^\d]', '', price_str)) if price_str else 0

            results.append({
                'asin': asin,
                'title': title,
                'price': price,
                'url': f'https://www.amazon.co.jp/dp/{asin}',
            })

            if len(results) >= limit:
                break

        return results

    except ImportError:
        print('[Amazon] BeautifulSoup4が必要です: pip install beautifulsoup4')
        return []
    except Exception as e:
        print(f'[Amazon] エラー: {e}')
        return []
