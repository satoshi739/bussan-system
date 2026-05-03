"""
グローバル価格取得モジュール
- Shopee (SG / MY / TH / PH / ID / TW)
- Lazada (SG / MY / TH / PH / ID)
- eBay（既存scrapers.pyのsearch_ebayを補完）
"""

import requests
import re
import time
from typing import List, Dict, Optional
from currency import jpy_to, to_jpy, FALLBACK_RATES, get_rates

# ───────────────────────────────────────────────────────────────
# Shopee 各国設定
# ───────────────────────────────────────────────────────────────

SHOPEE_MARKETS = {
    'SG': {
        'domain': 'shopee.sg',
        'currency': 'SGD',
        'name': 'Shopee SG',
        'flag': '🇸🇬',
    },
    'MY': {
        'domain': 'shopee.com.my',
        'currency': 'MYR',
        'name': 'Shopee MY',
        'flag': '🇲🇾',
    },
    'TH': {
        'domain': 'shopee.co.th',
        'currency': 'THB',
        'name': 'Shopee TH',
        'flag': '🇹🇭',
    },
    'PH': {
        'domain': 'shopee.ph',
        'currency': 'PHP',
        'name': 'Shopee PH',
        'flag': '🇵🇭',
    },
    'ID': {
        'domain': 'shopee.co.id',
        'currency': 'IDR',
        'name': 'Shopee ID',
        'flag': '🇮🇩',
    },
    'TW': {
        'domain': 'shopee.tw',
        'currency': 'TWD',
        'name': 'Shopee TW',
        'flag': '🇹🇼',
    },
}

# Lazada 各国設定
LAZADA_MARKETS = {
    'SG': {
        'domain': 'www.lazada.sg',
        'currency': 'SGD',
        'name': 'Lazada SG',
        'flag': '🇸🇬',
    },
    'MY': {
        'domain': 'www.lazada.com.my',
        'currency': 'MYR',
        'name': 'Lazada MY',
        'flag': '🇲🇾',
    },
    'TH': {
        'domain': 'www.lazada.co.th',
        'currency': 'THB',
        'name': 'Lazada TH',
        'flag': '🇹🇭',
    },
    'PH': {
        'domain': 'www.lazada.com.ph',
        'currency': 'PHP',
        'name': 'Lazada PH',
        'flag': '🇵🇭',
    },
    'ID': {
        'domain': 'www.lazada.co.id',
        'currency': 'IDR',
        'name': 'Lazada ID',
        'flag': '🇮🇩',
    },
}

_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/120.0.0.0 Safari/537.36'
    ),
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://shopee.sg/',
}


# ───────────────────────────────────────────────────────────────
# Shopee
# ───────────────────────────────────────────────────────────────

def search_shopee(keyword: str, country: str = 'SG', limit: int = 10) -> List[Dict]:
    """
    Shopee 指定国を検索して商品リストを返す。
    価格は現地通貨（price_local）と円換算（price_jpy）の両方を含む。
    """
    market = SHOPEE_MARKETS.get(country.upper())
    if not market:
        return []

    domain = market['domain']
    currency = market['currency']

    try:
        url = f"https://{domain}/api/v4/search/search_items/"
        params = {
            'keyword': keyword,
            'limit': limit,
            'newest': 0,
            'order': 'relevancy',
            'page_type': 'search',
            'scenario': 'PAGE_GLOBAL_SEARCH',
            'version': 2,
            'fe_categoryids': '',
        }
        headers = {
            **_HEADERS,
            'Referer': f'https://{domain}/search?keyword={requests.utils.quote(keyword)}',
        }
        resp = requests.get(url, params=params, headers=headers, timeout=12)

        if resp.status_code != 200:
            return []

        data = resp.json()
        items_raw = data.get('items', [])

        results = []
        for item_wrap in items_raw[:limit]:
            item = item_wrap.get('item_basic', item_wrap)
            name = item.get('name', '')
            # Shopee価格は 100000 倍の整数
            raw_price = item.get('price') or item.get('price_min')
            if raw_price is None or raw_price == 0:
                continue
            price_local = raw_price / 100000
            if price_local <= 0:
                continue

            price_jpy = to_jpy(price_local, currency)
            item_id = item.get('itemid', '')
            shop_id = item.get('shopid', '')
            link = f"https://{domain}/{name.replace(' ', '-').lower()}-i.{shop_id}.{item_id}" if item_id else f"https://{domain}/search?keyword={keyword}"
            image_id = item.get('image', '')
            image_url = f"https://cf.shopee.{domain.split('.')[-1]}/file/{image_id}" if image_id else ''

            results.append({
                'source': market['name'],
                'flag': market['flag'],
                'country': country,
                'currency': currency,
                'name': name,
                'price_local': price_local,
                'price_jpy': price_jpy,
                'url': link,
                'image': image_url,
                'sold': item.get('historical_sold', 0),
                'rating': round(item.get('item_rating', {}).get('rating_star', 0), 1),
                'platform': 'Shopee',
            })

        return results

    except Exception as e:
        print(f'[Shopee {country}] エラー: {e}')
        return []


def search_shopee_all(keyword: str, countries: List[str] = None, limit: int = 5) -> List[Dict]:
    """複数のShopee市場を一括検索"""
    if countries is None:
        countries = list(SHOPEE_MARKETS.keys())

    results = []
    for country in countries:
        items = search_shopee(keyword, country, limit)
        results.extend(items)
        time.sleep(0.3)  # レート制限対策

    return results


# ───────────────────────────────────────────────────────────────
# Lazada
# ───────────────────────────────────────────────────────────────

def search_lazada(keyword: str, country: str = 'SG', limit: int = 10) -> List[Dict]:
    """Lazada 指定国を検索"""
    market = LAZADA_MARKETS.get(country.upper())
    if not market:
        return []

    domain = market['domain']
    currency = market['currency']

    try:
        from bs4 import BeautifulSoup
        import urllib.parse

        encoded = urllib.parse.quote(keyword)
        url = f"https://{domain}/catalog/?q={encoded}&_keyori=ss&from=input&spm=a2o42.searchbar.search.go"
        headers = {
            **_HEADERS,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        resp = requests.get(url, headers=headers, timeout=12)
        if resp.status_code != 200:
            return []

        soup = BeautifulSoup(resp.text, 'html.parser')

        # Lazada buries data in script tags as JSON
        results = []

        # Try JSON data in <script> tags
        for script in soup.find_all('script'):
            text = script.string or ''
            if 'listItems' in text or 'mods' in text:
                import json
                # Try to extract JSON
                match = re.search(r'window\.__moduleData__\s*=\s*(\{.*?\});\s*</script>', text, re.DOTALL)
                if match:
                    try:
                        jdata = json.loads(match.group(1))
                        # Navigate to items
                        items = (
                            jdata.get('pageData', {})
                                 .get('mods', {})
                                 .get('listItems', [])
                        )
                        for item in items[:limit]:
                            price_str = str(item.get('price', '0'))
                            price_local = float(re.sub(r'[^\d.]', '', price_str)) if price_str else 0
                            if price_local <= 0:
                                continue
                            price_jpy = to_jpy(price_local, currency)
                            results.append({
                                'source': market['name'],
                                'flag': market['flag'],
                                'country': country,
                                'currency': currency,
                                'name': item.get('name', ''),
                                'price_local': price_local,
                                'price_jpy': price_jpy,
                                'url': item.get('itemUrl', ''),
                                'image': item.get('image', ''),
                                'sold': item.get('sold', 0),
                                'rating': float(item.get('ratingScore', 0)),
                                'platform': 'Lazada',
                            })
                        if results:
                            break
                    except Exception:
                        continue

        return results

    except ImportError:
        print('[Lazada] BeautifulSoup4 が必要です')
        return []
    except Exception as e:
        print(f'[Lazada {country}] エラー: {e}')
        return []


# ───────────────────────────────────────────────────────────────
# eBay（USD価格取得）
# ───────────────────────────────────────────────────────────────

def search_ebay_global(keyword: str, limit: int = 10) -> List[Dict]:
    """
    eBay を検索して国際販売用の価格情報を返す。
    既存の search_ebay() を補完し、より詳細な情報を提供。
    """
    try:
        from scrapers import search_ebay
        raw = search_ebay(keyword, limit)
        if not raw:
            return []

        results = []
        for item in raw:
            price_usd = item.get('price_usd', 0)
            price_jpy = item.get('price_jpy', 0)
            total_usd = item.get('price_usd', 0) + item.get('shipping_usd', 0)
            total_jpy = item.get('total_jpy', 0)

            results.append({
                'source': 'eBay',
                'flag': '🌏',
                'country': 'US',
                'currency': 'USD',
                'name': item.get('title', ''),
                'price_local': price_usd,
                'price_jpy': price_jpy,
                'total_local': total_usd,
                'total_jpy': total_jpy,
                'url': item.get('url', ''),
                'image': item.get('image', ''),
                'condition': item.get('condition', ''),
                'platform': 'eBay',
            })

        return results

    except Exception as e:
        print(f'[eBay Global] エラー: {e}')
        return []


# ───────────────────────────────────────────────────────────────
# グローバル市場一括検索
# ───────────────────────────────────────────────────────────────

def search_global_selling_prices(keyword: str, platforms: List[str] = None, limit: int = 5) -> Dict:
    """
    指定プラットフォームでキーワードを検索し、販売相場価格を収集する。

    Returns:
        {
          'platform_key': {
            'items': [...],
            'avg_price_local': ...,
            'min_price_local': ...,
            'avg_price_jpy': ...,
            'currency': ...,
            'name': ...,
          }
        }
    """
    if platforms is None:
        platforms = ['Shopee_SG', 'Shopee_MY', 'Shopee_TH', 'Lazada_SG', 'eBay']

    results = {}

    for p in platforms:
        if p.startswith('Shopee_'):
            country = p.split('_')[1]
            items = search_shopee(keyword, country, limit)
            key = p
        elif p.startswith('Lazada_'):
            country = p.split('_')[1]
            items = search_lazada(keyword, country, limit)
            key = p
        elif p == 'eBay':
            items = search_ebay_global(keyword, limit)
            key = 'eBay'
        else:
            continue

        if not items:
            results[key] = {'items': [], 'avg_price_local': 0, 'min_price_local': 0,
                            'avg_price_jpy': 0, 'currency': '', 'name': key}
            continue

        prices_local = [i['price_local'] for i in items if i.get('price_local', 0) > 0]
        prices_jpy = [i['price_jpy'] for i in items if i.get('price_jpy', 0) > 0]
        currency = items[0].get('currency', '') if items else ''
        name = items[0].get('source', key) if items else key
        flag = items[0].get('flag', '') if items else ''

        results[key] = {
            'items': items,
            'avg_price_local': round(sum(prices_local) / len(prices_local), 2) if prices_local else 0,
            'min_price_local': min(prices_local) if prices_local else 0,
            'max_price_local': max(prices_local) if prices_local else 0,
            'avg_price_jpy': round(sum(prices_jpy) / len(prices_jpy)) if prices_jpy else 0,
            'min_price_jpy': min(prices_jpy) if prices_jpy else 0,
            'currency': currency,
            'name': name,
            'flag': flag,
            'platform': items[0].get('platform', '') if items else '',
        }
        time.sleep(0.2)

    return results
