"""
物販チェッカー — 超かんたん版
"""

import streamlit as st
import pandas as pd
import time
import random
from datetime import date, datetime
import plotly.graph_objects as go
import plotly.express as px

from streamlit_autorefresh import st_autorefresh
from database import Database
from calculators import calculate_profit, find_breakeven_price, SELLING_PLATFORMS, CATEGORIES
from scrapers import search_all_buy_sites, get_amazon_price

st.set_page_config(page_title="物販チェッカー", page_icon="💰", layout="centered",
                   initial_sidebar_state="collapsed")


st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

/* ══════════════════════════════════
   ベース — 背景と文字色（読みやすく）
══════════════════════════════════ */
html, body, [class*="css"] {
    font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
    background: #060f08 !important;
    color: #e8f5eb !important;          /* ← 本文は明るい白緑 */
}
p, span, div, li { color: #e8f5eb; }   /* デフォルト文字を明るく */

/* グリッド背景 */
.stApp {
    background:
        linear-gradient(rgba(0,255,80,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,80,0.025) 1px, transparent 1px),
        radial-gradient(ellipse at 50% 0%, rgba(0,150,50,0.07) 0%, transparent 55%),
        #060f08 !important;
    background-size: 44px 44px, 44px 44px, 100% 100% !important;
}
#MainMenu, footer, header { visibility: hidden; }

/* ── ティッカー ── */
@keyframes ticker {
    0%   { transform: translateX(100vw); }
    100% { transform: translateX(-100%); }
}
.ticker-wrap {
    overflow: hidden; background: rgba(0,25,8,0.95);
    border-top: 1px solid #00ff5025; border-bottom: 1px solid #00ff5025;
    padding: 6px 0; margin-bottom: 10px; white-space: nowrap;
}
.ticker-inner {
    display: inline-block; animation: ticker 32s linear infinite;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.82rem; color: #5ddb8a; letter-spacing: 0.04em;
}
.t-up   { color: #4ddc80; }
.t-down { color: #ff6666; }
.t-sep  { color: #1a4a2a; margin: 0 14px; }

/* ── ナビ ── */
div[role="radiogroup"] {
    background: rgba(0,18,6,0.85); border: 1px solid #00ff5028;
    border-radius: 10px; padding: 5px; gap: 4px; backdrop-filter: blur(8px);
}
div[role="radiogroup"] label {
    background: transparent !important;
    color: #a8d8b8 !important;          /* ← ナビ文字を明るく */
    border-radius: 8px !important; padding: 9px 16px !important;
    font-weight: 700 !important; font-size: 0.95rem !important;
    border: none !important; transition: all 0.2s !important;
}
div[role="radiogroup"] label:has(input:checked) {
    background: linear-gradient(135deg,#004d1f,#006e2c) !important;
    color: #00ff80 !important; box-shadow: 0 0 10px #00ff5040 !important;
}

/* ── フォーム入力 ── */
input[type="number"] {
    background: rgba(0,12,4,0.95) !important; color: #00ff80 !important;
    border: 1px solid #00ff5050 !important; border-radius: 10px !important;
    font-size: 1.8rem !important; font-weight: 700 !important;
    font-family: 'Share Tech Mono', monospace !important;
    padding: 16px !important; height: 70px !important; text-align: center !important;
}
input[type="number"]:focus {
    border-color: #00ff80 !important;
    box-shadow: 0 0 14px #00ff8035 !important;
}
input[type="text"], input[type="password"] {
    background: rgba(0,12,4,0.95) !important; color: #e8f5eb !important;
    border: 1px solid #00ff5040 !important; border-radius: 10px !important;
    font-size: 1rem !important;
}
input[type="text"]:focus, input[type="password"]:focus {
    border-color: #00ff80 !important;
}
textarea {
    background: rgba(0,12,4,0.95) !important; color: #e8f5eb !important;
    border: 1px solid #00ff5040 !important; border-radius: 10px !important;
}

/* ラベル文字を明るく */
label, [data-testid="stWidgetLabel"] p,
.stSelectbox label, .stTextInput label,
.stNumberInput label, .stDateInput label,
.stTextArea label, .stFileUploader label {
    color: #b8dcc4 !important;          /* ← ラベルをしっかり見える緑白 */
    font-size: 0.95rem !important; font-weight: 700 !important;
}

[data-baseweb="select"] > div {
    background: rgba(0,12,4,0.95) !important; border: 1px solid #00ff5040 !important;
    border-radius: 10px !important; color: #e8f5eb !important; min-height: 48px !important;
}
/* セレクトボックスのオプション文字 */
[data-baseweb="option"] { background: #0a1f0e !important; color: #e8f5eb !important; }
[data-baseweb="option"]:hover { background: #0f3018 !important; }

/* ファイルアップローダー */
[data-testid="stFileUploader"] {
    background: rgba(0,15,6,0.7) !important; border: 2px dashed #00ff5044 !important;
    border-radius: 12px !important; padding: 8px !important;
}
[data-testid="stFileUploader"] span { color: #b8dcc4 !important; }
[data-testid="stFileUploader"] button { color: #00ff80 !important; }

/* ── ボタン ── */
.stButton > button {
    background: rgba(0,22,8,0.9) !important; color: #c8f0d8 !important;
    border: 1px solid #00ff5055 !important; border-radius: 10px !important;
    font-weight: 700 !important; font-size: 1rem !important;
    height: 3.2rem !important; width: 100% !important; transition: all 0.2s !important;
}
.stButton > button:hover {
    background: rgba(0,50,18,0.9) !important; color: #00ff80 !important;
    box-shadow: 0 0 12px #00ff5040 !important;
}
button[kind="primary"] {
    background: linear-gradient(135deg,#004d1f,#006629) !important;
    color: #00ff80 !important; border: 1px solid #00ff8060 !important;
    font-size: 1.1rem !important; height: 3.5rem !important;
    box-shadow: 0 0 18px #00ff5030 !important;
}
button[kind="primary"]:hover { box-shadow: 0 0 28px #00ff5060 !important; }

/* ── アラート ── */
.stSuccess { background:rgba(0,28,10,0.95) !important; border:1px solid #00bb4488 !important;
             color:#55ee88 !important; border-radius:10px !important; font-size:1rem !important; }
.stError   { background:rgba(38,0,0,0.95) !important; border:1px solid #cc222288 !important;
             color:#ff7777 !important; border-radius:10px !important; font-size:1rem !important; }
.stWarning { background:rgba(28,18,0,0.95) !important; border:1px solid #aa880088 !important;
             color:#ffcc55 !important; border-radius:10px !important; font-size:1rem !important; }
.stInfo    { background:rgba(0,18,28,0.95) !important; border:1px solid #2288bb88 !important;
             color:#66ccff !important; border-radius:10px !important; font-size:1rem !important; }

/* ── expander ── */
[data-testid="stExpander"] {
    background: rgba(0,14,5,0.9) !important; border: 1px solid #00ff5030 !important;
    border-radius: 12px !important; margin-bottom: 10px !important;
}
[data-testid="stExpander"] summary {
    color: #d8f0de !important; font-weight: 700 !important; font-size: 1rem !important;
}
[data-testid="stExpander"] p,
[data-testid="stExpander"] span { color: #d8f0de !important; }

/* ── metric ── */
[data-testid="stMetric"] {
    background: rgba(0,14,5,0.9) !important; border: 1px solid #00ff5030 !important;
    border-radius: 12px !important; padding: 18px !important;
}
[data-testid="stMetricValue"] {
    color: #00ff80 !important; font-weight: 800 !important;
    font-family: 'Share Tech Mono', monospace !important;
}
[data-testid="stMetricLabel"] { color: #b8dcc4 !important; font-weight: 600 !important; }

/* ── テーブル ── */
[data-testid="stDataFrame"] { border: 1px solid #00ff5020 !important; border-radius: 10px !important; }
thead tr th {
    background: rgba(0,35,12,0.95) !important; color: #7deeaa !important;
    font-weight: 700 !important;
}
tbody tr td { color: #d8f0de !important; }
tbody tr:hover td { background: rgba(0,50,18,0.35) !important; }

/* ── タブ ── */
[data-baseweb="tab-list"] {
    background: transparent !important; border-bottom: 1px solid #00ff5028 !important;
}
[data-baseweb="tab"] { color: #88cc99 !important; font-weight: 700 !important; }
[aria-selected="true"][data-baseweb="tab"] {
    color: #00ff80 !important; border-bottom: 2px solid #00ff80 !important;
}

/* write/markdown テキスト */
.stMarkdown p { color: #d8f0de !important; line-height: 1.7; }
.stWrite p    { color: #d8f0de !important; }

hr { border-color: #00ff5018 !important; }

/* ── caption / small text ── */
.stCaption { color: #88bb99 !important; }

/* ── モバイル ── */
@media (max-width: 768px) {
    div[role="radiogroup"] { flex-wrap: wrap !important; gap: 5px !important; }
    div[role="radiogroup"] label {
        padding: 7px 10px !important; font-size: 0.85rem !important;
        flex: 1 1 auto !important; text-align: center !important;
    }
    input[type="number"] { font-size: 1.3rem !important; height: 56px !important; }
    .ticker-inner { font-size: 0.72rem !important; }
    .stButton > button { height: 3.6rem !important; font-size: 1rem !important; }
    button[kind="primary"] { height: 3.8rem !important; }
}

/* ── スキャンライン ── */
.stApp::after {
    content: '';
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(
        0deg, transparent, transparent 2px,
        rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
    );
    pointer-events: none; z-index: 9999;
}
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def get_db():
    return Database()
db = get_db()

# ===== 為替ティッカー =====
st.markdown("""
<div class="ticker-wrap">
  <span class="ticker-inner">
    <span class="t-up">▲ メルカリ 手数料10%</span>
    <span class="t-sep">｜</span>
    <span class="t-up">▲ PayPayフリマ 手数料5%</span>
    <span class="t-sep">｜</span>
    <span class="t-up">▲ ラクマ 手数料6%</span>
    <span class="t-sep">｜</span>
    <span class="t-down">▼ ZOZOTOWN 手数料35%</span>
    <span class="t-sep">｜</span>
    <span class="t-up">▲ ジモティー 手数料0%</span>
    <span class="t-sep">｜</span>
    <span class="t-up">▲ Amazon FBA 対応</span>
    <span class="t-sep">｜</span>
    <span class="t-up">▲ eBay 世界190カ国</span>
    <span class="t-sep">｜</span>
    <span class="t-up">▲ Yahoo!オークション 手数料8.8%</span>
    <span class="t-sep">｜</span>
    <span class="t-up">▲ BASE 手数料3%+40円</span>
    <span class="t-sep">｜</span>
    <span class="t-up">▲ Etsy 手数料6.5%</span>
    <span class="t-sep">｜</span>
    <span class="t-down">▼ Amazon.com 手数料15%</span>
    <span class="t-sep">｜</span>
    <span class="t-up">▲ ヤフーショッピング 手数料7.4%</span>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  </span>
</div>

<!-- ヘッダー -->
<div style="text-align:center; padding:20px 0 14px;">
    <div style="font-family:'Share Tech Mono',monospace; font-size:0.75rem;
                color:#00ff5066; letter-spacing:0.2em; margin-bottom:6px;">
        TRADING SYSTEM v2.0 ● LIVE
    </div>
    <div style="font-size:2rem; font-weight:900; color:#00ff80;
                text-shadow: 0 0 20px #00ff8066, 0 0 40px #00ff8033;
                font-family:'Share Tech Mono',monospace; letter-spacing:0.05em;">
        物販チェッカー
    </div>
    <div style="color:#4aaa6a; margin-top:6px; font-size:0.95rem; letter-spacing:0.05em;">
        買う値段と売る値段を入れるだけ　▶　16か所いっきに比較
    </div>
</div>
""", unsafe_allow_html=True)

pages = ["🔥 おすすめ案件", "💰 もうかる？", "🗺️ 儲かるルート", "🔍 商品を探す", "🤖 AI監視", "📊 成績・グラフ", "📦 在庫管理", "📋 登録ガイド", "⚙️ 設定"]
page = st.radio("ページ", pages, horizontal=True, label_visibility="collapsed")
st.markdown("<hr>", unsafe_allow_html=True)


# ============================================================
# 💰 もうかる？チェック
# ============================================================

# 仕入れサイト一覧（手数料なし）
BUY_SITES = [
    ("📍", "ジモティー",         "無料〜格安",   0),
    ("🏪", "メルカリ",           "フリマ",       0),
    ("🛍️", "ラクマ",             "フリマ",       0),
    ("💛", "PayPayフリマ",       "フリマ",       0),
    ("🔨", "Yahoo!オークション", "オークション", 0),
    ("📦", "Amazon",             "EC",           0),
    ("🔴", "楽天",               "EC",           0),
    ("📚", "ブックオフ",         "リサイクル",   0),
    ("🎮", "ハードオフ",         "リサイクル",   0),
    ("👗", "セカンドストリート", "リサイクル",   0),
    ("🌏", "eBay（海外）",       "海外EC",       0),
    ("🇨🇳", "AliExpress",        "中国EC",       0),
    ("🇺🇸", "Amazon.com（米国）","米国EC",       0),
    ("🎨", "Etsy（海外）",       "海外EC",       0),
    ("📖", "ネットオフ",         "リサイクル",   0),
    ("🏬", "その他",             "",             0),
]

def show_check():
    import base64 as _b64e

    # ── STEP1: ルート選択 ──
    st.markdown("""
    <div style="font-size:1rem; font-weight:800; color:#b8dcc4; margin-bottom:10px;">
        STEP 1　どこで買って、どこで売りますか？
    </div>
    """, unsafe_allow_html=True)

    buy_labels  = [f"{s[0]} {s[1]}" for s in BUY_SITES]
    sell_labels = [f"{v['emoji']} {k}" for k, v in SELLING_PLATFORMS.items()]

    ca, arr, cb = st.columns([5, 1, 5])
    with ca:
        st.markdown("<div style='text-align:center; color:#88aaff; font-weight:700; "
                    "font-size:0.9rem; margin-bottom:4px;'>📥 買うサイト</div>",
                    unsafe_allow_html=True)
        buy_site_raw = st.selectbox("買うサイト", buy_labels, label_visibility="collapsed",
                                    key="buy_site")
    with arr:
        st.markdown("<div style='text-align:center; font-size:2rem; color:#00ff80; "
                    "margin-top:28px;'>→</div>", unsafe_allow_html=True)
    with cb:
        st.markdown("<div style='text-align:center; color:#00ff80; font-weight:700; "
                    "font-size:0.9rem; margin-bottom:4px;'>📤 売るサイト</div>",
                    unsafe_allow_html=True)
        # 前回の選択を保持
        default_sell_idx = st.session_state.get('sell_site_idx', 0)
        sell_site_raw = st.selectbox("売るサイト", sell_labels, index=default_sell_idx,
                                     label_visibility="collapsed", key="sell_site")
        st.session_state['sell_site_idx'] = sell_labels.index(sell_site_raw)

    sell_platform = sell_site_raw.split(" ", 1)[1] if " " in sell_site_raw else sell_site_raw

    # 選択ルートを表示
    buy_site_name = buy_site_raw.split(" ", 1)[1] if " " in buy_site_raw else buy_site_raw
    st.markdown(f"""
    <div style="background:rgba(0,10,4,0.7); border:1px solid #00ff5033;
                border-radius:10px; padding:10px 16px; margin:8px 0 14px;
                text-align:center; font-size:0.95rem;">
        <span style="color:#88aaff; font-weight:700;">{buy_site_raw}</span>
        <span style="color:#00ff80; font-size:1.2rem; margin:0 12px;">→</span>
        <span style="color:#00ff80; font-weight:700;">{sell_site_raw}</span>
        &nbsp;&nbsp;
        <span style="color:#4aaa6a; font-size:0.82rem;">
            手数料: {SELLING_PLATFORMS.get(sell_platform, {}).get('fee_rate', 0.10)*100:.0f}%
            &nbsp;|&nbsp;
            {SELLING_PLATFORMS.get(sell_platform, {}).get('note', '')}
        </span>
    </div>
    """, unsafe_allow_html=True)

    # ── STEP2: 金額入力 ──
    st.markdown("""
    <div style="font-size:1rem; font-weight:800; color:#b8dcc4; margin-bottom:10px;">
        STEP 2　値段を入れてください
    </div>
    """, unsafe_allow_html=True)

    c1, c2 = st.columns(2)
    with c1:
        st.markdown(f"<div style='text-align:center; font-size:0.95rem; font-weight:700; "
                    f"color:#88aaff; margin-bottom:4px;'>📥 {buy_site_name} での仕入れ値（円）</div>",
                    unsafe_allow_html=True)
        buy = st.number_input("買う値段", min_value=0, step=100, format="%d",
                              label_visibility="collapsed", key="buy")
        buy_ship = st.number_input("＋ 送料・手数料（円）", min_value=0, step=100, format="%d",
                                   key="buy_ship", help="仕入れ時の送料があれば入力")
    with c2:
        st.markdown(f"<div style='text-align:center; font-size:0.95rem; font-weight:700; "
                    f"color:#00ff80; margin-bottom:4px;'>📤 {sell_platform} での販売価格（円）</div>",
                    unsafe_allow_html=True)
        sell = st.number_input("売る値段", min_value=0, step=100, format="%d",
                               label_visibility="collapsed", key="sell")
        sell_ship = st.number_input("＋ 発送送料（円）", min_value=0, step=100, format="%d",
                                    key="sell_ship", help="買い手への発送送料があれば入力")

    # ── STEP3: 結果 ──
    if buy > 0 and sell > 0:
        r = calculate_profit(
            float(buy), float(sell), 'その他',
            shipping_to_platform=float(sell_ship),
            purchase_shipping=float(buy_ship),
            selling_platform=sell_platform,
        )
        profit   = r['gross_profit']
        rate_pct = r['profit_rate']
        fees     = r['platform_fees']

        st.markdown("""
        <div style="font-size:1rem; font-weight:800; color:#b8dcc4; margin:14px 0 8px;">
            STEP 3　結果
        </div>
        """, unsafe_allow_html=True)

        if profit > 0 and rate_pct >= 20:
            bg = "linear-gradient(135deg,#062812,#083d1c)"
            border, color, top_msg = "#00cc55", "#00ff80", "🎉　もうかります！"
        elif profit > 0:
            bg = "linear-gradient(135deg,#161000,#241800)"
            border, color, top_msg = "#aaaa00", "#ffdd44", "😊　少し利益が出ます"
        else:
            bg = "linear-gradient(135deg,#200808,#300e0e)"
            border, color, top_msg = "#cc2222", "#ff6666", "😥　赤字になります"

        total_cost = buy + buy_ship + fees + sell_ship

        st.markdown(f"""
        <div style="background:{bg}; border:2px solid {border}44;
                    border-left:4px solid {border}; border-radius:16px;
                    padding:22px 24px; margin:8px 0;">
            <div style="color:{color}; font-size:1.05rem; font-weight:700;
                        margin-bottom:6px;">{top_msg}</div>
            <div style="color:{color}; font-size:3.5rem; font-weight:900;
                        font-family:'Share Tech Mono',monospace; letter-spacing:-1px;">
                {"+" if profit>=0 else ""}¥{profit:,.0f}
            </div>
            <div style="color:{color}; font-size:1rem; opacity:0.9; margin-top:4px;">
                利益率　{rate_pct:.1f}%
            </div>
            <div style="display:flex; gap:16px; margin-top:14px; flex-wrap:wrap;">
                <div style="background:rgba(0,0,0,0.25); border-radius:8px;
                            padding:8px 14px; font-size:0.82rem; color:#a8c8b8;">
                    仕入れ値 ¥{buy:,}
                </div>
                <div style="background:rgba(0,0,0,0.25); border-radius:8px;
                            padding:8px 14px; font-size:0.82rem; color:#a8c8b8;">
                    仕入れ送料 ¥{buy_ship:,}
                </div>
                <div style="background:rgba(0,0,0,0.25); border-radius:8px;
                            padding:8px 14px; font-size:0.82rem; color:#a8c8b8;">
                    販売手数料 ¥{fees:,.0f}
                </div>
                <div style="background:rgba(0,0,0,0.25); border-radius:8px;
                            padding:8px 14px; font-size:0.82rem; color:#a8c8b8;">
                    発送送料 ¥{sell_ship:,}
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # 利益率20%以上 → 緊急記録フォーム
        if profit > 0 and rate_pct >= 20:
            st.markdown("""
            <div style="color:#00ff80; font-size:0.9rem; font-weight:700;
                        text-align:center; margin:6px 0 2px;">
                ✅ 利益率20%以上！ 今すぐ仕入れましょう！
            </div>
            """, unsafe_allow_html=True)
            with st.form("quick_emergency"):
                qname  = st.text_input("🏷️ 商品名", placeholder="例：Nintendo Switch 本体")
                qphoto = st.file_uploader("📷 商品の写真（なくてもOK）",
                                          type=['jpg','jpeg','png','webp'],
                                          key="emergency_photo")
                if qphoto:
                    st.image(qphoto, caption="プレビュー", width=160)
                if st.form_submit_button("🚨　仕入れを記録する！", type="primary"):
                    if qname:
                        qimg = _b64e.b64encode(qphoto.read()).decode() if qphoto else None
                        db.add_purchase({
                            'product_name': qname, 'platform': buy_site_raw,
                            'purchase_price': float(buy),
                            'purchase_shipping': float(buy_ship),
                            'purchase_url': '',
                            'purchase_date': date.today().isoformat(),
                            'notes': (f"{buy_site_raw} → {sell_site_raw} | "
                                      f"売値¥{sell:,} 利益¥{profit:,.0f}({rate_pct:.1f}%)"),
                            'image_data': qimg,
                        })
                        st.success("✅ 記録しました！「📦 在庫管理」で確認できます")
                    else:
                        st.warning("商品名を入れてください")
        elif profit > 0:
            from calculators import max_purchase_price
            ok = max_purchase_price(float(sell), selling_platform=sell_platform)
            st.warning(f"⚠️ 利益はありますが少ないです。¥{ok:,.0f} 以下で仕入れれば利益率20%になります。")
        else:
            from calculators import max_purchase_price
            ok = max_purchase_price(float(sell), selling_platform=sell_platform)
            st.error(f"❌ 赤字です。¥{ok:,.0f} 以下で仕入れれば黒字になります。")

        # ── 全プラットフォーム比較 ──
        st.markdown("""
        <div style="font-size:1rem; font-weight:800; color:#b8dcc4; margin:18px 0 8px;">
            🏆 他のサイトで売ったらどうなる？（仕入れ値・送料はそのまま）
        </div>
        """, unsafe_allow_html=True)

        rows = []
        for pf_name, info in SELLING_PLATFORMS.items():
            rv = calculate_profit(
                float(buy), float(sell), 'その他',
                shipping_to_platform=float(sell_ship),
                purchase_shipping=float(buy_ship),
                selling_platform=pf_name,
            )
            gp, rp = rv['gross_profit'], rv['profit_rate']
            highlight = "⭐ 今選択中" if pf_name == sell_platform else (
                        "✅ おすすめ！" if gp > 0 and rp >= 20 else (
                        "😊 利益あり" if gp > 0 else "❌ 赤字"))
            rows.append({'売る場所': f"{info['emoji']} {pf_name}",
                         '手数料': f"{info['fee_rate']*100:.1f}%" if info['fee_rate'] else '〜15%',
                         'もうけ': gp, '利益率': rp, '判定': highlight, 'area': info['area']})
        rows.sort(key=lambda x: x['もうけ'], reverse=True)

        def fmt_rows(lst):
            out = []
            for i, r in enumerate(lst):
                medal = ["🥇","🥈","🥉"][i] if i < 3 else f"{i+1}位"
                out.append({'順位': medal, '売る場所': r['売る場所'], '手数料': r['手数料'],
                             'もうけ': f"¥{r['もうけ']:,.0f}",
                             '利益率': f"{r['利益率']:.1f}%", '判定': r['判定']})
            return out

        tab_d, tab_f = st.tabs(["🇯🇵 国内", "🌏 海外"])
        with tab_d:
            st.dataframe(pd.DataFrame(fmt_rows([r for r in rows if r['area']=='国内'])),
                         use_container_width=True, hide_index=True)
        with tab_f:
            st.dataframe(pd.DataFrame(fmt_rows([r for r in rows if r['area']=='海外'])),
                         use_container_width=True, hide_index=True)

        best = rows[0]
        if best['売る場所'].split(" ",1)[1] != sell_platform:
            st.markdown(f"""
            <div style="background:rgba(0,30,12,0.9); border:1px solid #00ff5055;
                        border-radius:12px; padding:14px 20px; margin-top:8px; text-align:center;">
                <span style="color:#b8dcc4; font-size:0.88rem;">
                    💡 {sell_site_raw} より <b style="color:#00ff80;">{best['売る場所']}</b>
                    で売った方が <b style="color:#00ff80;">¥{best['もうけ']:,.0f}（{best['利益率']:.1f}%）</b>
                    になります
                </span>
            </div>
            """, unsafe_allow_html=True)

    else:
        st.markdown(f"""
        <div style="background:rgba(0,10,4,0.7); border:2px dashed #00ff5022;
                    border-radius:18px; padding:40px 20px; text-align:center; margin-top:8px;">
            <div style="font-size:2.5rem;">👆</div>
            <div style="color:#7abf94; font-size:1.05rem; margin-top:12px; line-height:2.2;">
                <b style="color:#88aaff;">{buy_site_raw}</b>　で仕入れ値を入れて<br>
                <b style="color:#00ff80;">{sell_site_raw}</b>　で売る値段を入れると<br>
                <b style="color:#e8f5eb;">すぐに利益を計算します</b>
            </div>
        </div>
        """, unsafe_allow_html=True)


# ============================================================
# 🔍 商品を探す（複数サイト一括検索）
# ============================================================
def show_search():
    st.markdown("""
    <div style="font-size:1.2rem; font-weight:800; color:#e8f5eb; margin-bottom:4px;">
        🔍 商品を探す・仕入れる
    </div>
    <div style="color:#88bb99; margin-bottom:12px; font-size:0.9rem;">
        キーワードで検索 → メルカリ・ラクマ・Yahoo!オークションを一括比較<br>
        儲かる商品は <b style="color:#00ff80;">🚨 仕入れ記録ボタン</b>、その後 <b style="color:#7deeaa;">📝 出品文も自動生成</b> できます
    </div>
    """, unsafe_allow_html=True)

    # ── 仕入れ〜販売フロー ──
    st.markdown("""
    <div style="display:flex; gap:2px; margin-bottom:14px; flex-wrap:wrap; font-size:0.72rem;">
        <div style="background:rgba(0,20,60,0.8); border:1px solid #4488ff44;
                    border-radius:8px; padding:8px 10px; flex:1; min-width:80px; text-align:center;">
            <div style="font-size:1.1rem;">🔍</div>
            <div style="color:#88aaff; font-weight:700; margin-top:2px;">① 検索</div>
        </div>
        <div style="color:#00ff5044; display:flex; align-items:center; font-size:1.2rem; padding:0 2px;">›</div>
        <div style="background:rgba(0,25,8,0.8); border:1px solid #00ff5044;
                    border-radius:8px; padding:8px 10px; flex:1; min-width:80px; text-align:center;">
            <div style="font-size:1.1rem;">💰</div>
            <div style="color:#00ff80; font-weight:700; margin-top:2px;">② 利益確認</div>
        </div>
        <div style="color:#00ff5044; display:flex; align-items:center; font-size:1.2rem; padding:0 2px;">›</div>
        <div style="background:rgba(0,22,8,0.8); border:1px solid #00cc5533;
                    border-radius:8px; padding:8px 10px; flex:1; min-width:80px; text-align:center;">
            <div style="font-size:1.1rem;">🛒</div>
            <div style="color:#7deeaa; font-weight:700; margin-top:2px;">③ 入札・購入</div>
            <div style="color:#4a8a5a; font-size:0.68rem;">(サイトで行う)</div>
        </div>
        <div style="color:#00ff5044; display:flex; align-items:center; font-size:1.2rem; padding:0 2px;">›</div>
        <div style="background:rgba(3,18,3,0.8); border:1px solid #00884433;
                    border-radius:8px; padding:8px 10px; flex:1; min-width:80px; text-align:center;">
            <div style="font-size:1.1rem;">📝</div>
            <div style="color:#aaddaa; font-weight:700; margin-top:2px;">④ 記録</div>
        </div>
        <div style="color:#00ff5044; display:flex; align-items:center; font-size:1.2rem; padding:0 2px;">›</div>
        <div style="background:rgba(2,15,2,0.8); border:1px solid #00664422;
                    border-radius:8px; padding:8px 10px; flex:1; min-width:80px; text-align:center;">
            <div style="font-size:1.1rem;">🏷️</div>
            <div style="color:#88cc88; font-weight:700; margin-top:2px;">⑤ 出品文生成</div>
        </div>
        <div style="color:#00ff5044; display:flex; align-items:center; font-size:1.2rem; padding:0 2px;">›</div>
        <div style="background:rgba(0,30,10,0.8); border:1px solid #00ff8033;
                    border-radius:8px; padding:8px 10px; flex:1; min-width:80px; text-align:center;">
            <div style="font-size:1.1rem;">🎉</div>
            <div style="color:#00ff80; font-weight:700; margin-top:2px;">⑥ 販売！</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ルートページからのキーワード引き継ぎ
    default_kw = st.session_state.pop('search_keyword', '')

    col_s, col_b = st.columns([4, 1])
    with col_s:
        keyword = st.text_input("商品名", value=default_kw,
                                placeholder="例：Nintendo Switch、iPhone 15、ダイソン 掃除機",
                                label_visibility="collapsed")
    with col_b:
        do_search = st.button("🔍 検索！", type="primary", use_container_width=True)

    # キーワードが引き継がれた場合は自動検索
    if default_kw and not do_search:
        do_search = True

    # 売り先（どこで売るか）
    sell_opts = [f"{v['emoji']} {k}" for k, v in SELLING_PLATFORMS.items() if v['area'] == '国内']
    sel_platform_raw = st.selectbox("💰 どこで売る予定？（利益計算に使います）",
                                    sell_opts, index=0)
    sel_platform = sel_platform_raw.split(" ", 1)[1] if " " in sel_platform_raw else sel_platform_raw

    if do_search and keyword:
        with st.spinner("複数サイトを同時に検索中...　少しお待ちください"):
            items = search_all_buy_sites(keyword, limit=6)

        if not items:
            st.warning("検索結果がありませんでした。キーワードを変えて試してください。")
            st.info("💡 メルカリ・ラクマ・Yahoo!オークションを検索しています。\neBayも検索するには設定からApp IDを登録してください。")
            return

        # Amazon販売価格を自動取得（あれば）
        st.markdown(f"**{len(items)}件 見つかりました（安い順）**")

        for i, item in enumerate(items):
            buy_price = item['price']
            rv = calculate_profit(float(buy_price), float(buy_price * 2), 'その他',
                                  selling_platform=sel_platform)
            # 仮の売値は仕入れ値の2倍で試算、後でユーザーが調整
            # ここでは仕入れ値だけ表示して、売値は入力させる

            with st.container():
                st.markdown(f"""
                <div style="background:#161b22; border:1px solid #30363d; border-radius:16px;
                            padding:16px 20px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="flex:1;">
                            <div style="color:#8b949e; font-size:0.8rem; margin-bottom:2px;">
                                {item['source']}
                            </div>
                            <div style="color:#e6edf3; font-weight:700; font-size:1rem;
                                        margin-bottom:6px; line-height:1.4;">
                                {item['name'][:50]}{'...' if len(item['name'])>50 else ''}
                            </div>
                            <div style="color:#58a6ff; font-size:1.5rem; font-weight:900;">
                                ¥{buy_price:,}
                            </div>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)

                c1, c2, c3 = st.columns([2, 2, 2])
                with c1:
                    sell_price_i = st.number_input(
                        "いくらで売る？（円）",
                        min_value=0, step=100, format="%d",
                        value=int(buy_price * 1.5),
                        key=f"sp_{i}",
                        help="売りたい値段を入れると利益を計算します"
                    )
                with c2:
                    if sell_price_i > 0:
                        rv2 = calculate_profit(float(buy_price), float(sell_price_i), 'その他',
                                               selling_platform=sel_platform)
                        gp = rv2['gross_profit']
                        rp = rv2['profit_rate']
                        if gp > 0:
                            color = "#3fb950" if rp >= 20 else "#d29922"
                            st.markdown(f"""
                            <div style="background:#0d2818; border:1px solid #238636;
                                        border-radius:12px; padding:12px; text-align:center; margin-top:22px;">
                                <div style="color:{color}; font-size:1.3rem; font-weight:900;">
                                    +¥{gp:,.0f}
                                </div>
                                <div style="color:{color}; font-size:0.85rem;">
                                    利益率 {rp:.1f}%
                                </div>
                            </div>
                            """, unsafe_allow_html=True)
                        else:
                            st.markdown(f"""
                            <div style="background:#2d0f0f; border:1px solid #da3633;
                                        border-radius:12px; padding:12px; text-align:center; margin-top:22px;">
                                <div style="color:#f85149; font-size:1.3rem; font-weight:900;">
                                    ¥{gp:,.0f}
                                </div>
                                <div style="color:#f85149; font-size:0.85rem;">赤字</div>
                            </div>
                            """, unsafe_allow_html=True)
                with c3:
                    if sell_price_i > 0:
                        rv2 = calculate_profit(float(buy_price), float(sell_price_i), 'その他',
                                               selling_platform=sel_platform)
                        gp2 = rv2['gross_profit']
                        rp2 = rv2['profit_rate']
                        st.markdown("<div style='height:22px'></div>", unsafe_allow_html=True)
                        _recorded_key = f"recorded_{i}"
                        if gp2 > 0 and rp2 >= 20:
                            with st.form(f"emg_{i}"):
                                if st.form_submit_button("🚨 仕入れを記録する！", type="primary",
                                                         use_container_width=True):
                                    db.add_purchase({
                                        'product_name': item['name'][:100],
                                        'platform': item['source'],
                                        'purchase_price': float(buy_price),
                                        'purchase_shipping': 0,
                                        'purchase_url': item['url'],
                                        'purchase_date': date.today().isoformat(),
                                        'notes': f"売値予定 ¥{sell_price_i:,} / 予想利益 ¥{gp2:,.0f} ({rp2:.1f}%) / {sel_platform}で販売予定",
                                    })
                                    st.session_state[_recorded_key] = True
                        elif gp2 > 0:
                            with st.form(f"rec_{i}"):
                                if st.form_submit_button("📦 仕入れを記録する", use_container_width=True):
                                    db.add_purchase({
                                        'product_name': item['name'][:100],
                                        'platform': item['source'],
                                        'purchase_price': float(buy_price),
                                        'purchase_shipping': 0,
                                        'purchase_url': item['url'],
                                        'purchase_date': date.today().isoformat(),
                                        'notes': f"売値予定 ¥{sell_price_i:,} / 予想利益 ¥{gp2:,.0f}",
                                    })
                                    st.session_state[_recorded_key] = True

                        if st.session_state.get(_recorded_key):
                            st.success("✅ 記録しました！")

                if item['url']:
                    st.markdown(
                        f"<a href='{item['url']}' target='_blank'>"
                        f"<div style='background:linear-gradient(135deg,#0d2030,#1a3a50);"
                        f"border:1px solid #58a6ff55;border-radius:8px;padding:10px;"
                        f"text-align:center;color:#58a6ff;font-weight:700;font-size:0.9rem;"
                        f"margin-top:6px;'>🛒 商品ページを開いて購入する</div></a>",
                        unsafe_allow_html=True
                    )
                listing_panel(
                    item_name=item['name'],
                    buy_price=float(buy_price),
                    suggest_sell=float(sell_price_i) if sell_price_i > 0 else float(buy_price * 1.5),
                    key_prefix=f"srch_{i}_{int(buy_price)}",
                    source_url=item.get('url', ''),
                )
                st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)

    elif not keyword:
        st.markdown("""
        <div style="background:#161b22; border:2px dashed #30363d; border-radius:20px;
                    padding:40px 20px; text-align:center; margin-top:8px;">
            <div style="font-size:2.5rem;">🔍</div>
            <div style="color:#8b949e; font-size:1.1rem; margin-top:12px; line-height:2;">
                商品名を入れて<b style="color:#e6edf3;">「検索！」</b>を押すと<br>
                <b style="color:#58a6ff;">メルカリ</b>・<b style="color:#3fb950;">ラクマ</b>・
                <b style="color:#d29922;">Yahoo!オークション</b><br>
                を同時に検索します<br>
                <span style="font-size:0.9rem; opacity:0.7;">利益が出る商品には🚨ボタンが出ます</span>
            </div>
        </div>
        """, unsafe_allow_html=True)


# ============================================================
# 📊 成績・グラフ
# ============================================================
def show_dashboard():
    s = db.get_summary_stats()
    total_inv    = s.get('total_invested') or 0
    total_profit = s.get('total_profit') or 0
    total_sold   = s.get('total_sold') or 0
    total_purch  = s.get('total_purchases') or 0
    roi = (total_profit / total_inv * 100) if total_inv > 0 else 0

    st.markdown("""
    <div style="font-size:1.2rem; font-weight:900; color:#00ff80; margin-bottom:16px;">
        📊 あなたの成績
    </div>
    """, unsafe_allow_html=True)

    # ── サマリーカード ──
    c1, c2, c3, c4 = st.columns(4)
    def metric_card(col, label, value, sub="", color="#00ff80"):
        col.markdown(f"""
        <div style="background:rgba(0,15,6,0.85); border:1px solid #00ff5033;
                    border-radius:12px; padding:16px; text-align:center;">
            <div style="color:#4aaa6a; font-size:0.78rem; margin-bottom:4px;">{label}</div>
            <div style="color:{color}; font-size:1.5rem; font-weight:900;
                        font-family:'Share Tech Mono',monospace;">{value}</div>
            <div style="color:#2a5a3a; font-size:0.75rem; margin-top:2px;">{sub}</div>
        </div>
        """, unsafe_allow_html=True)

    metric_card(c1, "💴 総投資額",    f"¥{total_inv:,.0f}", f"{total_purch}件仕入れ")
    metric_card(c2, "💰 総利益",      f"¥{total_profit:,.0f}", "手数料・送料差引後",
                color="#00ff80" if total_profit >= 0 else "#ff5555")
    metric_card(c3, "📈 ROI",        f"{roi:.1f}%", "投資収益率",
                color="#00ff80" if roi >= 10 else "#ffcc44")
    metric_card(c4, "✅ 売れた数",    f"{total_sold}件", f"残り{total_purch - total_sold}件")

    st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)

    # ── 月別利益グラフ ──
    monthly = db.get_monthly_profit()
    if monthly:
        months  = [r['month'] for r in reversed(monthly)]
        profits = [r['profit'] for r in reversed(monthly)]
        counts  = [r['sales_count'] for r in reversed(monthly)]

        colors = ['#00ff80' if p >= 0 else '#ff4444' for p in profits]

        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=months, y=profits, marker_color=colors,
            text=[f'¥{p:,.0f}' for p in profits],
            textposition='outside', textfont=dict(color='#c8ffd4', size=11),
            hovertemplate='%{x}<br>利益: ¥%{y:,.0f}<extra></extra>',
        ))
        fig.update_layout(
            title=dict(text='月別 利益推移', font=dict(color='#c8ffd4', size=14)),
            paper_bgcolor='rgba(0,12,5,0.9)',
            plot_bgcolor='rgba(0,8,3,0.9)',
            font=dict(color='#4aaa6a'),
            xaxis=dict(gridcolor='#00ff5011', tickfont=dict(color='#4aaa6a')),
            yaxis=dict(gridcolor='#00ff5011', tickfont=dict(color='#4aaa6a'),
                       tickprefix='¥', tickformat=',.0f'),
            margin=dict(t=40, b=20, l=10, r=10),
            height=280,
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.markdown("""
        <div style="background:rgba(0,15,6,0.7); border:1px dashed #00ff5033;
                    border-radius:12px; padding:30px; text-align:center; color:#2a6a3a;">
            まだ売上データがありません。<br>
            商品が売れたら「📦 在庫管理」から「売れた！」を記録してください。
        </div>
        """, unsafe_allow_html=True)

    # ── 在庫パイプライン ──
    st.markdown("""
    <div style="font-size:1rem; font-weight:800; color:#c8ffd4; margin:16px 0 8px;">
        📦 在庫の状況
    </div>
    """, unsafe_allow_html=True)

    status_data = dict(db.get_status_breakdown())
    n_bought  = status_data.get('purchased', 0)
    n_listed  = status_data.get('listed', 0)
    n_sold    = status_data.get('sold', 0)
    n_return  = status_data.get('returned', 0)

    st.markdown(f"""
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <div style="background:rgba(0,30,60,0.8); border:1px solid #4488ff55;
                    border-radius:12px; padding:14px 18px; flex:1; min-width:100px; text-align:center;">
            <div style="color:#8ab4ff; font-size:0.8rem;">🟡 仕入れ済み</div>
            <div style="color:#c8d8ff; font-size:2rem; font-weight:900;
                        font-family:'Share Tech Mono',monospace;">{n_bought}</div>
            <div style="color:#4466aa; font-size:0.75rem;">出品待ち</div>
        </div>
        <div style="color:#00ff5066; font-size:1.5rem;">→</div>
        <div style="background:rgba(0,20,40,0.8); border:1px solid #00aaff55;
                    border-radius:12px; padding:14px 18px; flex:1; min-width:100px; text-align:center;">
            <div style="color:#44ccff; font-size:0.8rem;">🔵 出品中</div>
            <div style="color:#88ddff; font-size:2rem; font-weight:900;
                        font-family:'Share Tech Mono',monospace;">{n_listed}</div>
            <div style="color:#224466; font-size:0.75rem;">売れ待ち</div>
        </div>
        <div style="color:#00ff5066; font-size:1.5rem;">→</div>
        <div style="background:rgba(0,40,15,0.8); border:1px solid #00ff5055;
                    border-radius:12px; padding:14px 18px; flex:1; min-width:100px; text-align:center;">
            <div style="color:#00ff80; font-size:0.8rem;">🟢 売れた！</div>
            <div style="color:#00ff80; font-size:2rem; font-weight:900;
                        font-family:'Share Tech Mono',monospace;">{n_sold}</div>
            <div style="color:#2a6a3a; font-size:0.75rem;">利益確定</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ── 最近の売上 ──
    all_sales = db.get_all_sales()
    if all_sales:
        st.markdown("""
        <div style="font-size:1rem; font-weight:800; color:#c8ffd4; margin:18px 0 8px;">
            💰 最近の売上
        </div>
        """, unsafe_allow_html=True)
        rows = []
        for sv in all_sales[:10]:
            sv = dict(sv)
            profit = sv['net_profit']
            rows.append({
                '日付':   sv['sale_date'],
                '商品名': sv['product_name'][:20],
                '買った場所': sv.get('buy_platform','')[:10],
                '売った場所': sv.get('selling_platform','')[:10],
                '売値':  f"¥{sv['sale_price']:,.0f}",
                '利益':  f"{'+'if profit>=0 else ''}¥{profit:,.0f}",
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # ── プラットフォーム別プラフ ──
    platform_data = db.get_platform_breakdown()
    if platform_data and len(platform_data) > 1:
        st.markdown("""
        <div style="font-size:1rem; font-weight:800; color:#c8ffd4; margin:18px 0 8px;">
            🛒 仕入れ先の内訳
        </div>
        """, unsafe_allow_html=True)
        labels = [r[0][:12] for r in platform_data]
        values = [r[1] for r in platform_data]
        fig2 = go.Figure(go.Pie(
            labels=labels, values=values,
            hole=0.5,
            marker=dict(colors=['#00ff80','#00cc66','#44ffaa','#88ffcc',
                                  '#00aa55','#006633','#004422','#002211']),
            textfont=dict(color='#c8ffd4'),
        ))
        fig2.update_layout(
            paper_bgcolor='rgba(0,12,5,0)', plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color='#4aaa6a'),
            margin=dict(t=10, b=10, l=10, r=10), height=240,
            showlegend=True,
            legend=dict(font=dict(color='#4aaa6a'), bgcolor='rgba(0,0,0,0)'),
        )
        st.plotly_chart(fig2, use_container_width=True)


# ============================================================
# 📦 在庫管理（仕入れ記録 + 状態管理 + 売上記録）
# ============================================================
def show_inventory():
    STATUS_JP    = {'purchased':'🟡 仕入れ済み','listed':'🔵 出品中','sold':'🟢 売れた！','returned':'🔴 返品'}
    STATUS_EN    = {v: k for k, v in STATUS_JP.items()}

    tab_new, tab_stock, tab_sold = st.tabs(["➕ 新しく仕入れる", "📋 在庫一覧・出品する", "💰 売上一覧"])

    # ── 新規仕入れ ──
    with tab_new:
        import base64
        st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
        with st.form("add_form"):
            name   = st.text_input("🏷️ 商品名 ＊")
            c1, c2 = st.columns(2)
            buy_p  = c1.number_input("💴 買った値段（円）＊", min_value=0, step=100, format="%d")
            ship   = c1.number_input("🚚 送料（円）", min_value=0, step=100, format="%d")
            where  = c2.selectbox("🛒 買った場所 ＊",
                        ["📍 ジモティー","🏪 メルカリ","🛍️ ラクマ","💛 PayPayフリマ",
                         "🔨 Yahoo!オークション","📦 Amazon","🔴 楽天",
                         "🌏 eBay（海外）","🇨🇳 AliExpress",
                         "📚 ブックオフ","🎮 ハードオフ","👗 セカンドストリート","その他"])
            pdate  = c2.date_input("📅 買った日", value=date.today())

            # ── 写真 ──
            uploaded = st.file_uploader(
                "📷 商品の写真（なくてもOK）",
                type=['jpg','jpeg','png','webp'],
                help="スマホで撮った写真やスクリーンショットをそのままアップできます"
            )
            if uploaded:
                st.image(uploaded, caption="プレビュー", width=200)

            url    = st.text_input("🔗 商品URL（なくてもOK）")
            note   = st.text_area("📝 メモ（なくてもOK）", height=70)

            if st.form_submit_button("✅　記録する", type="primary"):
                if name and buy_p > 0:
                    img_b64 = None
                    if uploaded:
                        img_b64 = base64.b64encode(uploaded.read()).decode()
                    db.add_purchase({
                        'product_name': name, 'platform': where,
                        'purchase_price': float(buy_p), 'purchase_shipping': float(ship),
                        'purchase_url': url, 'purchase_date': pdate.isoformat(),
                        'notes': note, 'image_data': img_b64,
                    })
                    st.success("✅ 記録しました！「在庫一覧」タブで確認できます")
                else:
                    st.error("⚠️ 商品名と買った値段は必ず入れてください")

    # ── 在庫一覧 ──
    with tab_stock:
        sf = st.selectbox("しぼり込み",
                          ["未売（仕入れ済み＋出品中）", "全部見る"] + list(STATUS_JP.values()),
                          label_visibility="collapsed")

        if sf == "未売（仕入れ済み＋出品中）":
            items_p = list(db.get_purchases(status='purchased'))
            items_l = list(db.get_purchases(status='listed'))
            items   = items_p + items_l
        elif sf == "全部見る":
            items = list(db.get_purchases())
        else:
            items = list(db.get_purchases(status=STATUS_EN.get(sf)))

        if not items:
            st.info("該当する商品がありません。")
        else:
            st.markdown(f"**{len(items)}件**", unsafe_allow_html=True)

        for p in items:
            p     = dict(p)
            raw   = p['status']
            badge = STATUS_JP.get(raw, raw)
            cost  = p['purchase_price'] + (p['purchase_shipping'] or 0)

            with st.expander(f"{badge}　{p['product_name']}　仕入れ¥{cost:,.0f}"):
                # 写真がある場合は上部に大きく表示
                if p.get('image_data'):
                    import base64 as _b64
                    img_bytes = _b64.b64decode(p['image_data'])
                    ic1, ic2, ic3 = st.columns([2, 3, 2])
                    with ic2:
                        st.image(img_bytes, caption=p['product_name'], use_container_width=True)
                    st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)

                c1, c2 = st.columns(2)
                c1.write(f"**仕入れ値：** ¥{p['purchase_price']:,.0f}")
                c1.write(f"**送料：** ¥{p['purchase_shipping'] or 0:,.0f}")
                c1.write(f"**買った場所：** {p['platform']}")
                c2.write(f"**買った日：** {p['purchase_date']}")
                if p.get('notes'): st.caption(f"📝 {p['notes']}")
                if p.get('purchase_url'):
                    st.markdown(f"[🔗 元の商品ページ]({p['purchase_url']})")

                # ── 出品文ジェネレーター ──
                st.markdown("---")
                with st.expander("📝 出品文を自動で作る（コピペするだけ）"):
                    plat_opts = ["🏪 メルカリ", "🔨 Yahoo!オークション", "🛍️ ラクマ",
                                 "💛 PayPayフリマ", "📦 Amazon"]
                    gen_plat = st.selectbox("どこに出品しますか？", plat_opts,
                                            key=f"genplat_{p['id']}")
                    cond_opts = ["新品・未使用", "未使用に近い", "目立った傷や汚れなし",
                                 "やや傷や汚れあり", "傷や汚れあり", "全体的に状態が悪い"]
                    gen_cond = st.selectbox("商品の状態", cond_opts, index=2,
                                            key=f"gencond_{p['id']}")
                    gen_price = st.number_input("希望販売価格（円）",
                                               min_value=0, step=100, format="%d",
                                               value=int(cost * 1.5),
                                               key=f"genprice_{p['id']}")
                    gen_note = st.text_area("追加情報（付属品など）",
                                           placeholder="例：箱あり、取扱説明書付き",
                                           height=60, key=f"gennote_{p['id']}")

                    if st.button("✨ 出品文を生成する", key=f"gen_{p['id']}", type="primary"):
                        name_clean = p['product_name']
                        plat_name  = gen_plat.split(" ", 1)[1]

                        # タイトル生成
                        if "メルカリ" in gen_plat or "ラクマ" in gen_plat or "PayPay" in gen_plat:
                            title = f"【{gen_cond}】{name_clean}"
                            if len(title) > 40:
                                title = title[:40]
                        elif "Yahoo" in gen_plat:
                            title = f"{name_clean}【{gen_cond}】即決あり"
                        else:  # Amazon
                            title = name_clean

                        # 説明文生成
                        extra = f"\n\n【付属品・その他】\n{gen_note}" if gen_note.strip() else ""
                        if "Amazon" in gen_plat:
                            body = f"状態：{gen_cond}\n{extra.strip()}"
                        else:
                            body = f"""【商品名】
{name_clean}

【商品の状態】
{gen_cond}

【商品説明】
{name_clean} です。
大切に使用しておりました。
写真に写っているものがすべてです。{extra}

【発送について】
・梱包して丁寧に発送します
・発送後の連絡をお知らせします

【注意事項】
・素人保管のため完璧を求める方はご遠慮ください
・ご不明な点はコメントでお気軽にどうぞ

よろしくお願いします🙏"""

                        st.markdown(f"""
<div style="background:rgba(0,8,3,0.95); border:1px solid #00ff5044;
            border-radius:12px; padding:16px; margin-top:8px;">
  <div style="color:#00ff80; font-weight:800; font-size:0.9rem; margin-bottom:10px;">
    ✅ {plat_name} 用の出品文ができました！下をコピーして貼り付けてください
  </div>

  <div style="color:#b8dcc4; font-size:0.8rem; margin-bottom:4px; font-weight:700;">📌 タイトル（コピーして貼り付け）</div>
  <div style="background:rgba(0,0,0,0.4); border-radius:8px; padding:10px 12px;
              color:#e8f5eb; font-size:0.95rem; font-weight:700; margin-bottom:10px;
              font-family:'Share Tech Mono',monospace;">
    {title}
  </div>

  <div style="color:#b8dcc4; font-size:0.8rem; margin-bottom:4px; font-weight:700;">💰 価格</div>
  <div style="background:rgba(0,0,0,0.4); border-radius:8px; padding:8px 12px;
              color:#00ff80; font-size:1.1rem; font-weight:900; margin-bottom:10px;
              font-family:'Share Tech Mono',monospace;">
    ¥{gen_price:,}
  </div>

  <div style="color:#b8dcc4; font-size:0.8rem; margin-bottom:4px; font-weight:700;">📝 説明文（コピーして貼り付け）</div>
  <div style="background:rgba(0,0,0,0.4); border-radius:8px; padding:10px 12px;
              color:#e8f5eb; font-size:0.88rem; line-height:1.8; white-space:pre-wrap;
              margin-bottom:10px;">
{body}
  </div>
</div>
                        """, unsafe_allow_html=True)

                        # 出品中に状態を更新
                        db.update_purchase_status(p['id'], 'listed')
                        st.success("✅ 状態を「出品中」に更新しました！")

                st.markdown("<div style='height:2px'></div>", unsafe_allow_html=True)
                st.markdown("---")

                # 状態変更
                new_st_label = st.selectbox("状態を変える",
                                            list(STATUS_JP.values()),
                                            index=list(STATUS_JP.keys()).index(raw),
                                            key=f"s_{p['id']}")
                new_st_key = STATUS_EN[new_st_label]

                # 「売れた！」のとき売値を入力させる
                if new_st_key == 'sold' and raw != 'sold':
                    sell_opts_inv = [f"{v['emoji']} {k}" for k, v in SELLING_PLATFORMS.items()
                                     if v['area'] == '国内']
                    sel_pl_raw = st.selectbox("どこで売りましたか？",
                                              sell_opts_inv, key=f"pl_{p['id']}")
                    sel_pl = sel_pl_raw.split(" ", 1)[1] if " " in sel_pl_raw else sel_pl_raw

                    sale_p = st.number_input("💰 いくらで売れましたか？（円）",
                                             min_value=0, step=100, format="%d",
                                             key=f"sp_{p['id']}")

                    if sale_p > 0:
                        from calculators import calculate_profit as cp
                        rv = cp(float(p['purchase_price']), float(sale_p), 'その他',
                                purchase_shipping=float(p['purchase_shipping'] or 0),
                                selling_platform=sel_pl)
                        profit_preview = rv['gross_profit']
                        rate_preview   = rv['profit_rate']
                        col_p = "#00ff80" if profit_preview >= 0 else "#ff5555"
                        st.markdown(f"""
                        <div style="background:rgba(0,20,8,0.8); border:1px solid #00ff5055;
                                    border-radius:10px; padding:12px; text-align:center; margin:8px 0;">
                            <span style="color:{col_p}; font-size:1.3rem; font-weight:900;">
                                {"+" if profit_preview>=0 else ""}¥{profit_preview:,.0f}　({rate_preview:.1f}%)
                            </span>
                            <div style="color:#2a6a3a; font-size:0.8rem; margin-top:4px;">
                                手数料・送料差引後の利益
                            </div>
                        </div>
                        """, unsafe_allow_html=True)

                    col_u, col_d, _ = st.columns([2, 1, 3])
                    if col_u.button("🎉 売れた！として記録", key=f"sold_{p['id']}", type="primary"):
                        if sale_p > 0:
                            net = db.record_sale_simple(p['id'], float(sale_p), sel_pl)
                            st.success(f"✅ 記録しました！利益 ¥{net:,.0f}")
                            st.rerun()
                        else:
                            st.error("売値を入力してください")
                    if col_d.button("削除", key=f"d_{p['id']}"):
                        db.delete_purchase(p['id'])
                        st.rerun()
                else:
                    col_u, col_d, _ = st.columns([1, 1, 4])
                    if col_u.button("更新", key=f"u_{p['id']}"):
                        db.update_purchase_status(p['id'], new_st_key)
                        st.rerun()
                    if col_d.button("削除", key=f"d_{p['id']}"):
                        db.delete_purchase(p['id'])
                        st.rerun()

    # ── 売上一覧 ──
    with tab_sold:
        all_sales = db.get_all_sales()
        if not all_sales:
            st.info("まだ売上がありません。商品が売れたら「在庫一覧」から「売れた！」を記録してください。")
            return

        total_net = sum(sv['net_profit'] for sv in all_sales)
        color_tot = "#00ff80" if total_net >= 0 else "#ff5555"
        st.markdown(f"""
        <div style="background:rgba(0,20,8,0.9); border:1px solid #00ff5055;
                    border-radius:12px; padding:14px 20px; text-align:center; margin-bottom:12px;">
            <div style="color:#4aaa6a; font-size:0.85rem;">累計利益</div>
            <div style="color:{color_tot}; font-size:2.2rem; font-weight:900;
                        font-family:'Share Tech Mono',monospace;">
                {"+" if total_net>=0 else ""}¥{total_net:,.0f}
            </div>
        </div>
        """, unsafe_allow_html=True)

        rows = []
        for sv in all_sales:
            sv = dict(sv)
            profit = sv['net_profit']
            rows.append({
                '日付':      sv['sale_date'],
                '商品名':    sv['product_name'][:22],
                '仕入れ値':  f"¥{sv['purchase_price']:,.0f}",
                '売値':      f"¥{sv['sale_price']:,.0f}",
                '利益':      f"{'+'if profit>=0 else ''}¥{profit:,.0f}",
                '売った場所': sv.get('selling_platform','')[:12],
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


# ============================================================
# 📦 記録する（旧・後方互換のため残す）
# ============================================================
def show_record():
    st.markdown("""
    <div style="font-size:1.2rem; font-weight:800; color:#e6edf3; margin-bottom:16px;">
        📦 買った商品を記録する
    </div>
    """, unsafe_allow_html=True)

    with st.form("add_form"):
        name   = st.text_input("🏷️ 商品名 ＊")
        c1, c2 = st.columns(2)
        buy_p  = c1.number_input("💴 買った値段（円）＊", min_value=0, step=100, format="%d")
        ship   = c1.number_input("🚚 送料（円）", min_value=0, step=100, format="%d")
        where  = c2.selectbox("🛒 買った場所 ＊",
                    ["🏪 メルカリ","🛍️ ラクマ","💛 PayPayフリマ","🔨 Yahoo!オークション",
                     "📦 Amazon","🔴 楽天","🌏 eBay（海外）","🇨🇳 AliExpress",
                     "📚 ブックオフ","🎮 ハードオフ","👗 セカンドストリート","その他"])
        pdate  = c2.date_input("📅 買った日", value=date.today())
        url    = st.text_input("🔗 商品URL（なくてもOK）")
        note   = st.text_area("📝 メモ（なくてもOK）", height=80)

        if st.form_submit_button("✅　記録する", type="primary"):
            if name and buy_p > 0:
                db.add_purchase({
                    'product_name': name, 'platform': where,
                    'purchase_price': float(buy_p), 'purchase_shipping': float(ship),
                    'purchase_url': url, 'purchase_date': pdate.isoformat(), 'notes': note,
                })
                st.success("✅ 記録しました！「履歴を見る」で確認できます")
            else:
                st.error("⚠️ 商品名と買った値段は必ず入れてください")


# ============================================================
# 📋 履歴を見る
# ============================================================
def show_history():
    STATUS_JP    = {'purchased':'🟡 仕入れ済み','listed':'🔵 出品中','sold':'🟢 売れた！','returned':'🔴 返品'}
    STATUS_EN    = {v:k for k,v in STATUS_JP.items()}
    STATUS_COLOR = {'purchased':'#d29922','listed':'#58a6ff','sold':'#3fb950','returned':'#f85149'}

    s = db.get_summary_stats()
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("📦 買った数",   f"{s['total_purchases'] or 0}個")
    c2.metric("💴 使ったお金", f"¥{s['total_invested'] or 0:,.0f}")
    c3.metric("✅ 売れた数",   f"{s['total_sold'] or 0}個")
    c4.metric("💰 もうけ合計", f"¥{s['total_profit'] or 0:,.0f}")

    st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)

    sf = st.selectbox("状態でしぼる", ["全部見る"] + list(STATUS_JP.values()))
    items = db.get_purchases(status=STATUS_EN.get(sf) if sf != "全部見る" else None)

    if not items:
        st.info("まだ記録がありません。「記録する」タブから追加できます。")
        return

    for p in items:
        p = dict(p)
        raw   = p['status']
        badge = STATUS_JP.get(raw, raw)
        color = STATUS_COLOR.get(raw, '#8b949e')
        with st.expander(f"{badge}　{p['product_name']}　¥{p['purchase_price']:,.0f}"):
            c1, c2 = st.columns(2)
            c1.write(f"**買った値段：** ¥{p['purchase_price']:,.0f}")
            c1.write(f"**送料：** ¥{p['purchase_shipping']:,.0f}")
            c1.write(f"**買った場所：** {p['platform']}")
            c2.write(f"**買った日：** {p['purchase_date']}")
            if p.get('notes'): st.caption(f"📝 {p['notes']}")
            if p.get('purchase_url'): st.markdown(f"[🔗 元の商品を見る]({p['purchase_url']})")

            new_st = st.selectbox("状態を変える", list(STATUS_JP.values()),
                                  index=list(STATUS_JP.keys()).index(raw),
                                  key=f"s_{p['id']}")
            col_u, col_d, _ = st.columns([1,1,4])
            if col_u.button("更新", key=f"u_{p['id']}"):
                db.update_purchase_status(p['id'], STATUS_EN[new_st])
                st.rerun()
            if col_d.button("削除", key=f"d_{p['id']}"):
                db.delete_purchase(p['id'])
                st.rerun()


# ============================================================
# 🗺️ 儲かるルート
# ============================================================
def show_routes():

    ROUTES = [
        {
            'rank': 1,
            'title': 'ブックオフ → Amazon',
            'buy': ('📚 ブックオフ・古本屋', '100〜500円'),
            'sell': ('📦 Amazon', '500〜5,000円'),
            'level': '⭐ 初心者向け',
            'level_color': '#00cc66',
            'profit': '30〜200%',
            'what': ['本', 'CD・DVD', 'ゲームソフト'],
            'why': 'Amazonの価格は高め。ブックオフで安く買った本が数倍で売れることがよくある。',
            'tips': 'バーコードを読んでAmazonの価格をその場で確認できるアプリ（Amazonショッピング等）が便利。',
            'border': '#00ff80',
        },
        {
            'rank': 2,
            'title': 'ジモティー → メルカリ',
            'buy': ('📍 ジモティー', '無料〜数百円'),
            'sell': ('🏪 メルカリ', '1,000〜50,000円'),
            'level': '⭐ 初心者向け',
            'level_color': '#00cc66',
            'profit': '数倍〜無限大',
            'what': ['家電（掃除機・扇風機）', '家具', '自転車', '楽器'],
            'why': 'ジモティーは手数料0円・無料でもらえることも。メルカリで普通の値段で売ればほぼ全部が利益。',
            'tips': '「無料」「0円」で検索すると本当に無料の商品が多い。壊れていても部品として売れる。',
            'border': '#00ff80',
        },
        {
            'rank': 3,
            'title': 'メルカリ・ラクマ → Amazon',
            'buy': ('🏪 メルカリ / 🛍️ ラクマ', '相場より安く'),
            'sell': ('📦 Amazon', '定価に近い価格'),
            'level': '⭐⭐ 中級者向け',
            'level_color': '#ffcc00',
            'profit': '15〜40%',
            'what': ['ゲーム・ゲーム機', '家電', 'カメラ', 'おもちゃ'],
            'why': 'フリマアプリは値下げ交渉文化で安くなりやすい。Amazonは定価に近い価格で売れる。',
            'tips': 'Amazonのランキング上位 & レビュー多い商品を狙う。需要が安定していて売れやすい。',
            'border': '#ffcc00',
        },
        {
            'rank': 4,
            'title': 'Yahoo!オークション → メルカリ',
            'buy': ('🔨 Yahoo!オークション', '落札価格'),
            'sell': ('🏪 メルカリ', '即決価格（高め）'),
            'level': '⭐⭐ 中級者向け',
            'level_color': '#ffcc00',
            'profit': '10〜30%',
            'what': ['コレクター品', 'ブランド品', 'アンティーク', '限定品'],
            'why': 'オークションは競争がなければ安く落とせる。メルカリは即決なので高値を設定できる。',
            'tips': '深夜・早朝に終了するオークションは競争が少なく安く落とせることが多い。',
            'border': '#ffcc00',
        },
        {
            'rank': 5,
            'title': 'eBay（海外） → メルカリ・Amazon',
            'buy': ('🌏 eBay', '海外価格（円安でお得）'),
            'sell': ('🏪 メルカリ / 📦 Amazon', '国内定価'),
            'level': '⭐⭐⭐ 上級者向け',
            'level_color': '#ff6644',
            'profit': '20〜100%',
            'what': ['海外限定品', '輸入ゲーム', 'ブランドスニーカー', 'ヴィンテージ品'],
            'why': '日本未発売・海外限定品は国内で希少価値が高い。円安で海外品が相対的に安くなっている。',
            'tips': '関税・送料に注意。1万円以下の商品は関税なしの場合が多い。輸送期間は2週間程度。',
            'border': '#ff6644',
        },
        {
            'rank': 6,
            'title': 'ラクマ・PayPayフリマ → メルカリ',
            'buy': ('🛍️ ラクマ / 💛 PayPayフリマ', '手数料が安い分、安め'),
            'sell': ('🏪 メルカリ', '同じ商品でも高い'),
            'level': '⭐ 初心者向け',
            'level_color': '#00cc66',
            'profit': '5〜15%',
            'what': ['なんでもOK（人気商品を選ぼう）'],
            'why': 'メルカリはユーザーが多いので同じ商品でも高く売れる。プラットフォーム間の価格差が利益源。',
            'tips': 'ラクマ・PayPayフリマで相場より10〜20%安い商品を探してメルカリで普通価格で売る。',
            'border': '#00ff80',
        },
        {
            'rank': 7,
            'title': 'AliExpress（中国） → Amazon・メルカリ',
            'buy': ('🇨🇳 AliExpress', '超激安・原価'),
            'sell': ('📦 Amazon / 🏪 メルカリ', '国内相場'),
            'level': '⭐⭐⭐ 上級者向け',
            'level_color': '#ff6644',
            'profit': '50〜500%',
            'what': ['スマホアクセサリー', 'LEDライト', 'ゲーム周辺機器', '雑貨'],
            'why': '中国の製造原価で買える。同じ商品が日本では5〜10倍で売られていることも。',
            'tips': '配送に2〜4週間かかる。品質の確認が必要。最初は小ロット（1〜5個）でテストして。',
            'border': '#ff6644',
        },
    ]

    st.markdown("""
    <div style="font-size:1.2rem; font-weight:900; color:#00ff80; margin-bottom:4px;">
        🗺️ 儲かる仕入れ → 販売ルート
    </div>
    <div style="color:#4aaa6a; font-size:0.9rem; margin-bottom:18px;">
        どこで買って、どこで売れば儲かるか。おすすめの組み合わせを教えます。
    </div>
    """, unsafe_allow_html=True)

    # レベルフィルター
    level_filter = st.radio("表示するレベル", ["全部見る", "⭐ 初心者向けだけ", "⭐⭐ 中級者向けも"],
                            horizontal=True, label_visibility="collapsed")

    st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)

    for route in ROUTES:
        if level_filter == "⭐ 初心者向けだけ" and "初心者" not in route['level']:
            continue
        if level_filter == "⭐⭐ 中級者向けも" and "上級" in route['level']:
            continue

        lc = route['level_color']
        bc = route['border']

        st.markdown(f"""
        <div style="background:rgba(0,12,5,0.9); border:1px solid {bc}44;
                    border-left:4px solid {bc}; border-radius:14px;
                    padding:18px 20px; margin-bottom:14px;">

          <!-- タイトル行 -->
          <div style="display:flex; justify-content:space-between; align-items:center;
                      flex-wrap:wrap; gap:8px; margin-bottom:14px;">
            <div style="color:#e8ffe8; font-size:1.15rem; font-weight:900;">
              {route['rank']}位　{route['title']}
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <span style="background:rgba(0,0,0,0.4); border:1px solid {lc}66;
                           color:{lc}; padding:3px 12px; border-radius:20px;
                           font-size:0.82rem; font-weight:700; white-space:nowrap;">
                {route['level']}
              </span>
              <span style="background:rgba(0,40,15,0.7); border:1px solid #00ff5044;
                           color:#00ff80; padding:3px 12px; border-radius:20px;
                           font-size:0.82rem; font-weight:700; white-space:nowrap;
                           font-family:'Share Tech Mono',monospace;">
                利益率 {route['profit']}
              </span>
            </div>
          </div>

          <!-- 買う → 売る フロー -->
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;
                      flex-wrap:wrap;">
            <div style="background:rgba(0,30,80,0.7); border:1px solid #4488ff55;
                        border-radius:10px; padding:10px 16px; flex:1; min-width:120px;">
              <div style="color:#8ab4ff; font-size:0.75rem; margin-bottom:3px;">📥 どこで買う？</div>
              <div style="color:#c8d8ff; font-weight:800; font-size:0.95rem;">
                {route['buy'][0]}
              </div>
              <div style="color:#6688cc; font-size:0.8rem; margin-top:2px;">
                相場: {route['buy'][1]}
              </div>
            </div>
            <div style="color:#00ff80; font-size:1.8rem; font-weight:900;">→</div>
            <div style="background:rgba(0,50,20,0.7); border:1px solid #00ff5055;
                        border-radius:10px; padding:10px 16px; flex:1; min-width:120px;">
              <div style="color:#4aaa6a; font-size:0.75rem; margin-bottom:3px;">📤 どこで売る？</div>
              <div style="color:#c8ffd4; font-weight:800; font-size:0.95rem;">
                {route['sell'][0]}
              </div>
              <div style="color:#2a7a4a; font-size:0.8rem; margin-top:2px;">
                {route['sell'][1]}
              </div>
            </div>
          </div>

          <!-- おすすめ商品 -->
          <div style="margin-bottom:10px;">
            <span style="color:#4aaa6a; font-size:0.8rem;">🛒 おすすめ商品：</span>
            {''.join(f'<span style="background:rgba(0,40,15,0.6); border:1px solid #00ff5033; color:#c8ffd4; padding:2px 10px; border-radius:20px; font-size:0.8rem; margin:2px 3px; display:inline-block;">{w}</span>' for w in route['what'])}
          </div>

          <!-- なぜ儲かる -->
          <div style="background:rgba(0,0,0,0.25); border-radius:8px; padding:10px 14px; margin-bottom:8px;">
            <div style="color:#4aaa6a; font-size:0.78rem; margin-bottom:3px;">💡 なぜ儲かる？</div>
            <div style="color:#a8d8b8; font-size:0.88rem; line-height:1.6;">{route['why']}</div>
          </div>

          <!-- コツ -->
          <div style="color:#2a6a4a; font-size:0.82rem; line-height:1.6;">
            🔑 コツ: {route['tips']}
          </div>

        </div>
        """, unsafe_allow_html=True)

        # 「このルートで検索する」ボタン
        example_kw = route['what'][0].replace('・', ' ').split('（')[0]
        if st.button(f"🔍 「{example_kw}」でいま検索する",
                     key=f"route_search_{route['rank']}", use_container_width=False):
            st.session_state['search_keyword'] = example_kw
            st.session_state['page_override'] = '🔍 商品を探す'
            st.rerun()

    # ── 初心者へのまとめ ──
    st.markdown("""
    <div style="background:linear-gradient(135deg,rgba(0,30,15,0.95),rgba(0,20,10,0.95));
                border:1px solid #00ff5066; border-radius:16px;
                padding:20px 22px; margin-top:8px;">
      <div style="color:#00ff80; font-size:1.05rem; font-weight:900; margin-bottom:12px;">
        🎯 まずはここから始めよう！
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="color:#c8ffd4; font-size:0.92rem; line-height:1.8;">
          <b style="color:#00ff80;">Step 1</b>　近所のブックオフやジモティーで安い商品を探す<br>
          <b style="color:#00ff80;">Step 2</b>　「💰 もうかる？」タブで買値・売値を入れて利益を確認する<br>
          <b style="color:#00ff80;">Step 3</b>　利益率20%以上なら「🚨 今すぐ仕入れ！」ボタンを押す<br>
          <b style="color:#00ff80;">Step 4</b>　メルカリ・Amazonに出品して売れたら記録する
        </div>
      </div>
      <div style="color:#2a6a4a; font-size:0.82rem; margin-top:12px;">
        💸 最初は1件数百円の利益でもOK。慣れてきたら高単価商品に挑戦しよう。
      </div>
    </div>
    """, unsafe_allow_html=True)


# ============================================================
# ⚙️ 設定
# ============================================================
def show_settings():
    import socket, io

    # ローカルIPを取得
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = None

    settings = db.get_settings()
    st.markdown("""
    <div style="font-size:1.2rem; font-weight:800; color:#00ff80; margin-bottom:4px;">⚙️ 設定</div>
    <div style="color:#4aaa6a; margin-bottom:16px;">設定しなくても全機能使えます</div>
    """, unsafe_allow_html=True)

    # ── スマホアクセス用QRコード ──
    if local_ip:
        mobile_url = f"http://{local_ip}:8501"
        st.markdown(f"""
        <div style="background:rgba(0,15,6,0.85); border:1px solid #00ff5055;
                    border-radius:14px; padding:18px 20px; margin-bottom:18px;">
            <div style="color:#00ff80; font-weight:800; font-size:1rem; margin-bottom:8px;">
                📱 スマホ・タブレットから使う
            </div>
            <div style="color:#4aaa6a; font-size:0.9rem; margin-bottom:10px; line-height:1.7;">
                同じWi-Fiに繋いだスマホのブラウザで下のURLを開いてください
            </div>
            <div style="background:rgba(0,0,0,0.4); border-radius:10px; padding:10px 16px;
                        font-family:'Share Tech Mono',monospace; color:#00ff80;
                        font-size:1.15rem; font-weight:700; text-align:center;">
                {mobile_url}
            </div>
        </div>
        """, unsafe_allow_html=True)

        # QRコード生成・表示
        try:
            import qrcode
            qr = qrcode.QRCode(version=1, box_size=6, border=2,
                                error_correction=qrcode.constants.ERROR_CORRECT_L)
            qr.add_data(mobile_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="#00ff80", back_color="#020c06")
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            buf.seek(0)
            c1, c2, c3 = st.columns([1, 2, 1])
            with c2:
                st.image(buf, caption="スマホのカメラで読み取ってください",
                         use_container_width=True)
        except Exception:
            pass

    with st.form("settings_form"):
        st.markdown("**💱 今の為替レート（1ドル＝何円？）**")
        usd = st.number_input("USD/JPY", value=float(settings.get('usd_jpy', 150)),
                              step=1.0, format="%.0f")

        st.markdown("---")
        st.markdown("**🌏 eBay App ID**（登録するとeBayを自動検索できます・無料）")
        ebay = st.text_input("App ID", value=settings.get('ebay_app_id',''), type="password")

        st.markdown("**📦 Keepa API**（Amazonの価格を自動取得できます・月1,500円程度）")
        keepa = st.text_input("Key", value=settings.get('keepa_api_key',''), type="password")

        if st.form_submit_button("💾　保存する", type="primary"):
            db.save_settings({'usd_jpy': usd, 'ebay_app_id': ebay, 'keepa_api_key': keepa})
            st.success("✅ 保存しました！")

    st.markdown("---")
    st.markdown("**💴 各サービスの手数料一覧**")
    rows = [
        {'売る場所': f"{v['emoji']} {k}",
         '手数料': f"{v['fee_rate']*100:.1f}%" if v['fee_rate'] else 'カテゴリー別',
         '説明': v['note'], '国内/海外': v['area']}
        for k, v in SELLING_PLATFORMS.items()
    ]
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


# ============================================================
# 🤖 AI分析エンジン
# ============================================================
def ai_analyze(item: dict, buy_price: float, sell_price: float,
               profit: float, rate: float, sell_platform: str) -> dict:
    """ルールベースのAI分析コメントを生成"""
    signals = []
    verdict = ""
    score = 0

    # 利益率スコア
    if rate >= 30:
        score += 3
        signals.append("📈 利益率30%超え！ 非常に高い")
    elif rate >= 20:
        score += 2
        signals.append("✅ 利益率20%以上　理想的")
    elif rate >= 10:
        score += 1
        signals.append("😊 利益率10%以上　悪くない")
    else:
        score -= 1
        signals.append("⚠️ 利益率が低め")

    # 利益額スコア
    if profit >= 3000:
        score += 2
        signals.append(f"💴 1件で¥{profit:,.0f}の利益　大きい")
    elif profit >= 1000:
        score += 1
        signals.append(f"💴 1件で¥{profit:,.0f}の利益")
    elif profit > 0:
        signals.append(f"💴 利益は¥{profit:,.0f}（少なめ）")
    else:
        score -= 2
        signals.append("❌ 赤字")

    # 仕入れ値スコア（安いほど在庫リスクが低い）
    if buy_price <= 1000:
        score += 1
        signals.append("🪙 仕入れ値が安い　在庫リスク低")
    elif buy_price >= 20000:
        score -= 1
        signals.append("💸 仕入れ値が高め　注意")

    # プラットフォーム別アドバイス
    if sell_platform == 'ジモティー':
        signals.append("📍 ジモティーは手数料0円！ 近くの人に売れれば最高")
    elif sell_platform in ['メルカリ', 'PayPayフリマ', 'ラクマ']:
        signals.append(f"📱 {sell_platform}はスマホで簡単に出品できる")
    elif sell_platform == 'eBay（輸出）':
        signals.append("🌏 eBayは世界190カ国に売れる　英語の説明文が必要")

    # 総合判定
    if score >= 4:
        verdict = "🚨 強く買いを推奨！ 今すぐ仕入れてください！"
        level = "HOT"
    elif score >= 2:
        verdict = "✅ 買い推奨。 利益が出る可能性が高いです"
        level = "BUY"
    elif score >= 0:
        verdict = "😐 検討余地あり。 もう少し安く買えれば理想的"
        level = "HOLD"
    else:
        verdict = "❌ 見送り推奨。 この価格では利益が出にくいです"
        level = "PASS"

    return {'signals': signals, 'verdict': verdict, 'level': level, 'score': score}


# ============================================================
# 🤖 AI監視ページ
# ============================================================
def show_monitor():
    # 自動更新（90秒ごと）
    count = st_autorefresh(interval=90_000, key="monitor_refresh")

    now_str = datetime.now().strftime("%H:%M:%S")

    st.markdown(f"""
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <div>
        <span style="font-size:1.3rem; font-weight:900; color:#00ff80;">🤖 AI自動監視</span>
        <span style="color:#4aaa6a; font-size:0.85rem; margin-left:10px;">90秒ごとに自動更新</span>
      </div>
      <div style="font-family:'Share Tech Mono',monospace; color:#00ff5088; font-size:0.85rem;">
        最終更新: {now_str} &nbsp;|&nbsp; #{count}回目
      </div>
    </div>
    <div style="color:#4aaa6a; font-size:0.9rem; margin-bottom:14px;">
        監視したい商品キーワードを登録 → AIが自動で仕入れ価格をチェックして儲かる案件をお知らせします
    </div>
    """, unsafe_allow_html=True)

    watchlist = db.get_watchlist()

    # ── ウォッチリスト登録 ──
    with st.expander("＋ 監視する商品を追加する"):
        with st.form("add_watch"):
            wc1, wc2, wc3 = st.columns([3, 2, 1])
            wkey  = wc1.text_input("🔍 商品キーワード", placeholder="例：Nintendo Switch、iPhone 15")
            sell_opts = [f"{v['emoji']} {k}" for k, v in SELLING_PLATFORMS.items()]
            wplat_raw = wc2.selectbox("💰 売る場所", sell_opts)
            wplat = wplat_raw.split(" ", 1)[1] if " " in wplat_raw else wplat_raw
            wrate = wc3.number_input("目標利益率%", value=20, min_value=1, max_value=99)
            if st.form_submit_button("追加する", type="primary"):
                if wkey:
                    db.add_watchlist_item(wkey, wplat, float(wrate))
                    st.success(f"「{wkey}」を監視リストに追加しました")
                    st.rerun()

    if not watchlist:
        st.markdown("""
        <div style="background:rgba(0,15,6,0.8); border:2px dashed #00ff5033;
                    border-radius:16px; padding:40px; text-align:center; margin-top:12px;">
            <div style="font-size:2.5rem;">🤖</div>
            <div style="color:#4aaa6a; font-size:1.05rem; margin-top:12px; line-height:2;">
                上の「＋ 監視する商品を追加する」から<br>
                キーワードを登録してください<br>
                <span style="font-size:0.85rem; color:#2a6a3a;">
                自動で各サイトの価格を調べて、儲かる案件を見つけます
                </span>
            </div>
        </div>
        """, unsafe_allow_html=True)
        return

    # ── 監視中リスト表示 ──
    st.markdown(f"**監視中: {len(watchlist)}件**")

    hot_count = 0

    for wi in watchlist:
        kw        = wi['keyword']
        sell_plat = wi.get('sell_platform', 'メルカリ')
        tgt_rate  = wi.get('target_rate', 20)

        st.markdown(f"""
        <div style="background:rgba(0,10,4,0.6); border:1px solid #00ff5044;
                    border-radius:14px; padding:14px 18px; margin:10px 0 4px;">
            <span style="color:#00ff80; font-weight:800; font-size:1.1rem;">🔍 {kw}</span>
            <span style="color:#4aaa6a; font-size:0.85rem; margin-left:10px;">
                → {sell_plat} で販売 ｜ 目標利益率 {tgt_rate:.0f}%
            </span>
        </div>
        """, unsafe_allow_html=True)

        col_del, _ = st.columns([1, 8])
        if col_del.button("削除", key=f"del_{kw}"):
            db.remove_watchlist_item(kw)
            st.rerun()

        with st.spinner(f"「{kw}」を検索中..."):
            results = search_all_buy_sites(kw, limit=4)

        if not results:
            st.caption("　→ 検索結果なし（サイトが混んでいるかもしれません）")
            continue

        # 最安値を軸に分析
        best_opportunities = []
        for item in results[:4]:
            bp = item['price']
            if bp <= 0:
                continue
            # 売値は仕入れ値の1.4〜2倍の範囲で最適を探す
            best_profit = -999999
            best_sell   = bp
            for mult in [1.3, 1.4, 1.5, 1.6, 1.8, 2.0]:
                sp_try = bp * mult
                rv = calculate_profit(float(bp), float(sp_try), 'その他',
                                      selling_platform=sell_plat)
                if rv['gross_profit'] > best_profit:
                    best_profit = rv['gross_profit']
                    best_sell   = sp_try
                    best_rv     = rv

            analysis = ai_analyze(item, bp, best_sell,
                                   best_rv['gross_profit'], best_rv['profit_rate'], sell_plat)
            best_opportunities.append({
                'item': item, 'buy': bp, 'sell': best_sell,
                'profit': best_rv['gross_profit'], 'rate': best_rv['profit_rate'],
                'analysis': analysis,
            })

        best_opportunities.sort(key=lambda x: x['profit'], reverse=True)

        for opp in best_opportunities[:3]:
            an    = opp['analysis']
            level = an['level']
            item  = opp['item']

            if level == 'HOT':
                hot_count += 1
                border_c = '#00ff80'; bg_c = 'rgba(0,40,15,0.9)'; badge_c = '#00ff80'
                badge = '🚨 HOT'
            elif level == 'BUY':
                border_c = '#44cc77'; bg_c = 'rgba(0,25,10,0.9)'; badge_c = '#44cc77'
                badge = '✅ BUY'
            elif level == 'HOLD':
                border_c = '#aaaa00'; bg_c = 'rgba(20,18,0,0.9)'; badge_c = '#cccc44'
                badge = '😐 HOLD'
            else:
                border_c = '#555'; bg_c = 'rgba(10,10,10,0.7)'; badge_c = '#888'
                badge = '❌ PASS'

            st.markdown(f"""
            <div style="background:{bg_c}; border:1px solid {border_c};
                        border-radius:12px; padding:14px 18px; margin:6px 0;">
              <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <div style="color:#c8ffd4; font-weight:700; font-size:0.95rem; flex:1;">
                  {item['source']} &nbsp;·&nbsp; {item['name'][:45]}{'...' if len(item['name'])>45 else ''}
                </div>
                <div style="color:{badge_c}; font-weight:900; font-size:0.9rem;
                            background:rgba(0,0,0,0.4); padding:2px 10px; border-radius:20px;
                            white-space:nowrap; margin-left:8px;">
                  {badge}
                </div>
              </div>
              <div style="display:flex; gap:24px; font-family:'Share Tech Mono',monospace;
                          font-size:0.9rem; margin-bottom:8px;">
                <span style="color:#4aaa6a;">仕入れ <b style="color:#58a6ff;">¥{opp['buy']:,.0f}</b></span>
                <span style="color:#4aaa6a;">売値目安 <b style="color:#c8ffd4;">¥{opp['sell']:,.0f}</b></span>
                <span style="color:#4aaa6a;">利益 <b style="color:{badge_c};">{"+" if opp['profit']>=0 else ""}¥{opp['profit']:,.0f} ({opp['rate']:.1f}%)</b></span>
              </div>
              <div style="font-size:0.82rem; color:#3a8a5a; margin-bottom:6px;">
                {'　'.join(an['signals'][:3])}
              </div>
              <div style="color:{badge_c}; font-size:0.88rem; font-weight:700;">
                🤖 AI判定: {an['verdict']}
              </div>
            </div>
            """, unsafe_allow_html=True)

            if level in ('HOT', 'BUY') and item['url']:
                c1, c2 = st.columns(2)
                with c1:
                    with st.form(f"emg_mon_{kw}_{item['url'][-10:]}"):
                        if st.form_submit_button("🚨 今すぐ仕入れを記録！", type="primary",
                                                  use_container_width=True):
                            db.add_purchase({
                                'product_name': item['name'][:100],
                                'platform': item['source'],
                                'purchase_price': float(opp['buy']),
                                'purchase_shipping': 0,
                                'purchase_url': item['url'],
                                'purchase_date': date.today().isoformat(),
                                'notes': (f"🤖AI推奨 | 売値¥{opp['sell']:,.0f} | "
                                          f"利益¥{opp['profit']:,.0f}({opp['rate']:.1f}%) | "
                                          f"{sell_plat}販売予定"),
                            })
                            st.success("✅ 仕入れを記録しました！")
                with c2:
                    st.markdown(
                        f"<a href='{item['url']}' target='_blank'>"
                        f"<div style='background:rgba(0,30,12,0.8); border:1px solid #00ff5044;"
                        f"border-radius:10px; padding:10px; text-align:center; color:#00e55b;"
                        f"font-weight:700; font-size:0.9rem; margin-top:1px;'>"
                        f"🔗 商品ページを見る</div></a>",
                        unsafe_allow_html=True
                    )

        st.markdown("<hr>", unsafe_allow_html=True)

    # ── サマリーバナー ──
    if hot_count > 0:
        st.markdown(f"""
        <div style="background:linear-gradient(135deg,rgba(0,60,20,0.95),rgba(0,40,15,0.95));
                    border:2px solid #00ff80; border-radius:16px;
                    padding:20px; text-align:center; margin-top:8px;
                    box-shadow: 0 0 30px #00ff8033;">
            <div style="color:#00ff80; font-size:1.6rem; font-weight:900;
                        text-shadow: 0 0 20px #00ff8088;">
                🚨 HOT案件が {hot_count}件 見つかりました！
            </div>
            <div style="color:#4aaa6a; font-size:0.9rem; margin-top:6px;">
                上の 🚨 今すぐ仕入れを記録！ ボタンを押してください
            </div>
        </div>
        """, unsafe_allow_html=True)


# ============================================================
# 🔥 おすすめ案件（自動で儲かる商品を探す）
# ============================================================

RECOMMEND_CATEGORIES = [
    {"emoji":"🎮","name":"ゲーム・ゲーム機",    "keywords":["Nintendo Switch","PlayStation 5","ゲームソフト"],         "sell":"メルカリ"},
    {"emoji":"📱","name":"スマホ・タブレット",  "keywords":["iPhone 14","iPad","Galaxy"],                             "sell":"メルカリ"},
    {"emoji":"🎵","name":"イヤホン・ヘッドフォン","keywords":["AirPods Pro","ソニー ヘッドフォン","ワイヤレスイヤホン"],"sell":"メルカリ"},
    {"emoji":"📚","name":"本・参考書",          "keywords":["ビジネス書","資格 テキスト","語学 参考書"],               "sell":"Amazon"},
    {"emoji":"👟","name":"スニーカー",          "keywords":["Nike Air Jordan","New Balance 990","アディダス スタンスミス"],"sell":"メルカリ"},
    {"emoji":"🧸","name":"おもちゃ・フィギュア","keywords":["レゴ","ガンプラ","ねんどろいど"],                        "sell":"メルカリ"},
    {"emoji":"🏠","name":"家電・生活用品",      "keywords":["ダイソン 掃除機","バルミューダ","ルンバ"],               "sell":"メルカリ"},
    {"emoji":"⌚","name":"時計・アクセサリー",  "keywords":["G-SHOCK","セイコー 腕時計","カシオ"],                   "sell":"Yahoo!オークション"},
    {"emoji":"🎒","name":"ブランド品・バッグ",  "keywords":["コーチ バッグ","ケイトスペード","マイケルコース"],       "sell":"メルカリ"},
    {"emoji":"🚴","name":"スポーツ・アウトドア","keywords":["モンベル","ノースフェイス","コールマン"],                "sell":"メルカリ"},
    {"emoji":"🎸","name":"楽器",               "keywords":["ヤマハ ギター","カシオ キーボード","ローランド"],        "sell":"メルカリ"},
    {"emoji":"💄","name":"コスメ・美容",        "keywords":["シュウウエムラ","NARS","アナスイ"],                     "sell":"メルカリ"},
]


def make_mercari_listing(name: str, buy_price: float, sell_price: float,
                          condition: str = "目立った傷や汚れなし",
                          extra: str = "") -> dict:
    """メルカリ出品用のタイトル・説明文・価格を生成"""
    title = f"【{condition}】{name}"
    if len(title) > 40:
        title = title[:39] + "…"

    extra_block = f"\n\n【付属品・その他】\n{extra}" if extra.strip() else ""

    body = f"""【商品名】
{name}

【商品の状態】
{condition}

【商品説明】
{name} です。
大切に使用・保管しておりました。
写真に写っているものがすべてです。{extra_block}

【発送について】
・丁寧に梱包して発送します
・発送後すぐに連絡いたします
・基本的に2〜3日以内に発送

【注意事項】
・素人保管のため神経質な方はご遠慮ください
・ご質問はコメントでお気軽にどうぞ

よろしくお願いします🙏"""

    return {"title": title, "body": body, "price": int(sell_price)}


def clipboard_button(text: str, label: str = "📋 ワンタップでコピー", key: str = "cb"):
    """JavaScriptでクリップボードにコピーするボタン"""
    import streamlit.components.v1 as components
    safe = (text.replace('\\', '\\\\')
                .replace('`', '\\`')
                .replace('\r', '')
                .replace('\n', '\\n'))
    components.html(f"""
    <button id="btn_{key}" onclick="
        navigator.clipboard.writeText(`{safe}`).then(function() {{
            document.getElementById('btn_{key}').innerHTML = '✅ コピーしました！';
            document.getElementById('btn_{key}').style.background = '#006622';
            setTimeout(function() {{
                document.getElementById('btn_{key}').innerHTML = '{label}';
                document.getElementById('btn_{key}').style.background = '';
            }}, 2500);
        }}).catch(function() {{
            document.getElementById('btn_{key}').innerHTML = '⚠️ 手動でコピーしてください';
        }});
    " style="
        background:linear-gradient(135deg,#0d2818,#1a4a2a);
        color:#00ff80; border:1px solid #00ff5066;
        border-radius:8px; padding:10px 16px;
        font-size:0.9rem; font-weight:700;
        cursor:pointer; width:100%; margin:2px 0;
        transition:all 0.2s;
    ">{label}</button>
    """, height=46)


def _best_platforms(buy_price: float, sell_price: float, top_n: int = 5):
    """全販売プラットフォームで利益を計算して上位N件を返す"""
    results = []
    for pf_name, info in SELLING_PLATFORMS.items():
        if info.get('area') != '国内':
            continue
        rv = calculate_profit(buy_price, sell_price, 'その他', selling_platform=pf_name)
        results.append({
            'name':     pf_name,
            'emoji':    info.get('emoji', '🏪'),
            'profit':   rv.get('gross_profit', 0),
            'rate':     rv.get('profit_rate', 0),
            'fee_rate': info.get('fee_rate', 0),
        })
    results.sort(key=lambda x: x['profit'], reverse=True)
    return results[:top_n]


_SELL_URLS = {
    'メルカリ':    'https://jp.mercari.com/sell',
    'ラクマ':      'https://fril.jp/sell',
    'Yahoo!フリマ':'https://paypayfleamarket.yahoo.co.jp/sell',
    'ヤフオク':    'https://auctions.yahoo.co.jp/sell/jp/show/submit',
    'Amazon':      'https://sellercentral.amazon.co.jp/',
    'eBay':        'https://www.ebay.com/sl/sell',
}


def listing_panel(item_name: str, buy_price: float, suggest_sell: float,
                  key_prefix: str, source_url: str = ""):
    """検索結果・おすすめ画面で使う出品パネル（全プラットフォーム比較 + 出品文生成）"""

    with st.expander("💹 どこで売ると一番儲かる？ → 出品する", expanded=False):

        # ── 販売価格入力 ──
        price = st.number_input("販売予定価格（円）", min_value=0, step=100, format="%d",
                                value=int(suggest_sell), key=f"price_{key_prefix}")

        # ── 全プラットフォーム比較 ──
        sell_val = float(price) if price > 0 else suggest_sell
        best = _best_platforms(buy_price, sell_val)

        medals = ["🥇", "🥈", "🥉", "4位", "5位"]
        rank_html = ""
        for idx, pf in enumerate(best):
            pcolor = "#00ff80" if pf['profit'] > 0 else "#ff6666"
            bg     = "rgba(0,30,12,0.9)" if idx == 0 else "rgba(0,12,5,0.7)"
            border = "#00ff80" if idx == 0 else "#00ff5033"
            crown  = " 👑 ここが一番お得！" if idx == 0 else ""
            rank_html += (
                f"<div style='display:flex;justify-content:space-between;align-items:center;"
                f"background:{bg};border:1px solid {border};border-radius:10px;"
                f"padding:8px 12px;margin-bottom:6px;'>"
                f"<div style='color:#c8ffd4;font-size:0.85rem;font-weight:700;'>"
                f"{medals[idx]} {pf['emoji']} {pf['name']}{crown}</div>"
                f"<div style='text-align:right;'>"
                f"<span style='color:{pcolor};font-size:1rem;font-weight:900;"
                f"font-family:monospace;'>{'+' if pf['profit']>=0 else ''}¥{pf['profit']:,.0f}</span>"
                f"<span style='color:#4aaa6a;font-size:0.75rem;margin-left:6px;'>"
                f"({pf['rate']:.1f}%) 手数料{pf['fee_rate']*100:.0f}%</span>"
                f"</div></div>"
            )

        st.markdown(
            f"<div style='margin:6px 0 10px;'>"
            f"<div style='color:#00ff80;font-weight:900;font-size:0.88rem;margin-bottom:8px;'>"
            f"📊 AIが全サイトを比較（仕入れ¥{buy_price:,} → 販売¥{int(sell_val):,}）</div>"
            f"{rank_html}</div>",
            unsafe_allow_html=True
        )

        # ── 最高利益プラットフォームのボタン ──
        if best:
            top_pf  = best[0]
            top_url = _SELL_URLS.get(top_pf['name'], '')
            if top_url:
                btn_color = "#00aa44" if top_pf['profit'] > 0 else "#666666"
                st.markdown(
                    f"<a href='{top_url}' target='_blank'>"
                    f"<div style='background:{btn_color};border-radius:10px;padding:12px;"
                    f"text-align:center;color:white;font-weight:900;font-size:0.95rem;"
                    f"box-shadow:0 0 16px {btn_color}55;margin-bottom:10px;'>"
                    f"{top_pf['emoji']} {top_pf['name']} の出品ページを開く（一番お得！）"
                    f"</div></a>",
                    unsafe_allow_html=True
                )

        st.markdown("<hr style='border-color:#00ff5022;margin:6px 0'>", unsafe_allow_html=True)

        # ── 出品文ジェネレーター ──
        st.markdown(
            "<div style='color:#c8ffd4;font-size:0.85rem;font-weight:700;margin-bottom:6px;'>"
            "📝 出品文を自動生成（コピペしてどこでも使えます）</div>",
            unsafe_allow_html=True
        )
        cond_opts = ["新品・未使用", "未使用に近い", "目立った傷や汚れなし",
                     "やや傷や汚れあり", "傷や汚れあり"]
        col_c, col_e = st.columns(2)
        with col_c:
            cond = st.selectbox("商品の状態", cond_opts, index=2, key=f"cond_{key_prefix}")
        with col_e:
            extra = st.text_input("付属品・補足（なくてもOK）",
                                  placeholder="例：箱あり、充電ケーブル付き",
                                  key=f"extra_{key_prefix}")

        listing = make_mercari_listing(item_name, buy_price, price, cond, extra)

        st.markdown(
            f"<div style='background:rgba(0,0,0,0.4);border:1px solid #00ff5022;"
            f"border-radius:8px;padding:8px 12px;color:#e8f5eb;font-size:0.92rem;"
            f"font-weight:700;margin-bottom:2px;letter-spacing:0.02em;'>"
            f"{listing['title']}</div>",
            unsafe_allow_html=True
        )
        clipboard_button(listing['title'], "📋 タイトルをコピー",
                         key=f"cp_title_{key_prefix}")

        st.markdown("<div style='height:6px'></div>", unsafe_allow_html=True)

        st.markdown(
            f"<div style='background:rgba(0,0,0,0.4);border:1px solid #00ff5022;"
            f"border-radius:8px;padding:8px 12px;color:#e8f5eb;font-size:0.82rem;"
            f"line-height:1.8;white-space:pre-wrap;max-height:180px;overflow-y:auto;"
            f"margin-bottom:2px;'>{listing['body']}</div>",
            unsafe_allow_html=True
        )
        clipboard_button(listing['body'], "📋 説明文をコピー",
                         key=f"cp_body_{key_prefix}")

        if source_url:
            st.markdown(
                f"<a href='{source_url}' target='_blank' style='color:#6aaa88;"
                f"font-size:0.8rem;'>🔗 仕入れ元の商品ページも開く</a>",
                unsafe_allow_html=True
            )


def show_recommend():
    import base64 as _b64e

    st.markdown("""
    <div style="text-align:center; padding:4px 0 14px;">
        <div style="font-size:1.4rem; font-weight:900; color:#00ff80;">🔥 おすすめ案件を探す</div>
        <div style="color:#88bb99; font-size:0.88rem; margin-top:4px;">
            カテゴリーを選ぶだけ — AIが自動で儲かる商品を探します
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ── カテゴリー選択グリッド ──
    selected_cat = st.session_state.get('rec_category', None)
    cols = st.columns(3)
    for i, cat in enumerate(RECOMMEND_CATEGORIES):
        label  = f"{cat['emoji']} {cat['name']}"
        is_sel = selected_cat == label
        border = "#00ff80" if is_sel else "#00ff5030"
        bg     = "rgba(0,55,22,0.75)" if is_sel else "rgba(0,14,5,0.6)"
        color  = "#00ff80" if is_sel else "#b8dcc4"
        with cols[i % 3]:
            st.markdown(f"""
            <div style="background:{bg}; border:1px solid {border};
                        border-radius:10px; padding:8px 4px; text-align:center; margin-bottom:2px;">
                <div style="font-size:1.3rem;">{cat['emoji']}</div>
                <div style="color:{color}; font-size:0.75rem; font-weight:700;
                            margin-top:2px; line-height:1.3;">{cat['name']}</div>
            </div>
            """, unsafe_allow_html=True)
            if st.button(cat['name'], key=f"cat_{i}", use_container_width=True):
                st.session_state['rec_category'] = label
                st.session_state['rec_cat_idx']  = i
                st.rerun()

    selected_cat = st.session_state.get('rec_category')
    if not selected_cat:
        st.markdown("""
        <div style="background:rgba(0,10,4,0.6); border:2px dashed #00ff5020;
                    border-radius:14px; padding:28px; text-align:center; margin-top:10px;">
            <div style="font-size:2rem;">☝️</div>
            <div style="color:#6aaa88; font-size:1rem; margin-top:8px; line-height:2;">
                カテゴリーをタップすると<br>
                <b style="color:#e8f5eb;">自動で儲かる商品を探します</b>
            </div>
        </div>
        """, unsafe_allow_html=True)
        return

    st.markdown("<hr>", unsafe_allow_html=True)

    cat_idx = st.session_state.get('rec_cat_idx', 0)
    cat     = RECOMMEND_CATEGORIES[cat_idx]

    # 売り先選択
    sell_opts = [f"{v['emoji']} {k}" for k, v in SELLING_PLATFORMS.items() if v['area']=='国内']
    emoji_for_sell = SELLING_PLATFORMS.get(cat['sell'], {}).get('emoji','🏪')
    default_sell   = f"{emoji_for_sell} {cat['sell']}"
    default_idx    = sell_opts.index(default_sell) if default_sell in sell_opts else 0

    c_sell, c_clear = st.columns([5, 1])
    with c_sell:
        sell_raw = st.selectbox(f"📤 どこで売りますか？", sell_opts,
                                index=default_idx, key="rec_sell")
    with c_clear:
        st.markdown("<div style='height:26px'></div>", unsafe_allow_html=True)
        if st.button("↩️ 戻る", use_container_width=True):
            del st.session_state['rec_category']
            st.rerun()

    sell_platform = sell_raw.split(" ",1)[1] if " " in sell_raw else sell_raw

    # ── 検索 ──
    all_items = []
    progress  = st.progress(0, text=f"🔍 {cat['name']} を検索中...")
    for ki, kw in enumerate(cat['keywords']):
        progress.progress((ki+1)/len(cat['keywords']),
                          text=f"🔍 「{kw}」を検索中... ({ki+1}/{len(cat['keywords'])})")
        for item in search_all_buy_sites(kw, limit=4):
            item['keyword'] = kw
            all_items.append(item)
    progress.empty()

    if not all_items:
        st.warning("検索結果が見つかりませんでした。しばらくして再試行してください。")
        return

    # ── 利益計算・スコアリング ──
    from calculators import find_breakeven_price
    scored = []
    for item in all_items:
        bp = item['price']
        if bp <= 0:
            continue
        sp  = bp * 1.5
        rv  = calculate_profit(float(bp), float(sp), 'その他', selling_platform=sell_platform)
        be  = find_breakeven_price(float(bp), selling_platform=sell_platform)
        scored.append({**item, 'buy_price': bp, 'suggest_sell': be * 1.25,
                        'profit': rv['gross_profit'], 'rate': rv['profit_rate']})

    scored.sort(key=lambda x: x['rate'], reverse=True)
    hot  = [x for x in scored if x['rate'] >= 20]
    mild = [x for x in scored if 0 < x['rate'] < 20]
    disp = (hot + mild)[:12]

    n_hot = len(hot)
    st.markdown(f"""
    <div style="display:flex; gap:10px; align-items:center; margin:10px 0 8px; flex-wrap:wrap;">
        <div style="font-size:1rem; font-weight:900; color:#e8f5eb;">
            {cat['emoji']} {cat['name']} の検索結果
        </div>
        {'<div style="background:rgba(0,55,18,0.9); border:1px solid #00ff5066; color:#00ff80; font-weight:800; padding:3px 12px; border-radius:20px; font-size:0.85rem;">🔥 HOT ' + str(n_hot) + '件</div>' if n_hot > 0 else '<div style="color:#6a8a6a; font-size:0.82rem;">利益20%以上の案件が見つかりませんでした</div>'}
        <div style="color:#6aaa88; font-size:0.8rem;">{sell_raw} で販売した場合</div>
    </div>
    """, unsafe_allow_html=True)

    if not disp:
        st.info("利益が出る商品が見つかりませんでした。別のカテゴリーや売り先を試してください。")
        return

    for item in disp:
        rate = item['rate']
        bp   = item['buy_price']
        sp   = item['suggest_sell']
        rv2  = calculate_profit(float(bp), float(sp), 'その他', selling_platform=sell_platform)
        prf  = rv2['gross_profit']
        rt2  = rv2['profit_rate']

        if rt2 >= 30:
            heat="🔥🔥🔥"; bc="#ff7700"; bdc="#ff9944"; btxt="超HOT！"
        elif rt2 >= 20:
            heat="🔥🔥"; bc="#00ff80"; bdc="#00ff80"; btxt="おすすめ！"
        elif rt2 >= 10:
            heat="🔥"; bc="#ffcc44"; bdc="#ffcc44"; btxt="利益あり"
        else:
            heat=""; bc="#445544"; bdc="#6a8a6a"; btxt="少なめ"

        st.markdown(f"""
        <div style="background:rgba(0,12,4,0.9); border:1px solid {bc}33;
                    border-left:4px solid {bc}; border-radius:12px;
                    padding:14px 16px; margin-bottom:4px;">
          <div style="color:#888; font-size:0.72rem; margin-bottom:3px;">
            {item['source']} &nbsp;·&nbsp; {item.get('keyword','')}
          </div>
          <div style="color:#e8f5eb; font-weight:700; font-size:0.95rem;
                      line-height:1.4; margin-bottom:10px;">
            {item['name'][:52]}{'...' if len(item['name'])>52 else ''}
          </div>
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <div style="text-align:center;">
              <div style="color:#6aaa88; font-size:0.7rem;">仕入れ値</div>
              <div style="color:#88aaff; font-size:1.25rem; font-weight:900;
                          font-family:'Share Tech Mono',monospace;">¥{bp:,}</div>
            </div>
            <div style="color:#00ff5066; font-size:1.5rem; font-weight:300;">→</div>
            <div style="text-align:center;">
              <div style="color:#6aaa88; font-size:0.7rem;">目安売値</div>
              <div style="color:#e8f5eb; font-size:1.25rem; font-weight:900;
                          font-family:'Share Tech Mono',monospace;">¥{sp:,.0f}</div>
            </div>
            <div style="flex:1; min-width:100px;"></div>
            <div style="background:rgba(0,0,0,0.3); border:1px solid {bc}55;
                        border-radius:10px; padding:8px 16px; text-align:center;">
              <div style="color:{bdc}; font-size:1.3rem; font-weight:900;
                          font-family:'Share Tech Mono',monospace;">
                +¥{prf:,.0f}
              </div>
              <div style="color:{bdc}; font-size:0.78rem; font-weight:700;">
                {heat} 利益率 {rt2:.0f}%&nbsp; {btxt}
              </div>
            </div>
          </div>
        </div>
        """, unsafe_allow_html=True)

        _rec_key = f"rec_done_{int(bp)}_{item['name'][:6]}"
        b1, b2, b3 = st.columns([2, 2, 2])
        with b1:
            with st.form(f"rbuy_{item['source'][:4]}_{int(bp)}_{item['name'][:6]}"):
                if st.form_submit_button(
                    "🚨 仕入れを記録！",
                    type="primary" if rt2 >= 20 else "secondary",
                    use_container_width=True
                ):
                    db.add_purchase({
                        'product_name': item['name'][:100],
                        'platform':     item['source'],
                        'purchase_price': float(bp),
                        'purchase_shipping': 0,
                        'purchase_url': item.get('url',''),
                        'purchase_date': date.today().isoformat(),
                        'notes': (f"🔥おすすめ | {cat['name']} | 目安売値¥{sp:,.0f} | "
                                  f"予想利益¥{prf:,.0f}({rt2:.0f}%) | {sell_platform}販売予定"),
                        'image_data': None,
                    })
                    st.session_state[_rec_key] = True
        with b2:
            if item.get('url'):
                st.markdown(
                    f"<a href='{item['url']}' target='_blank'>"
                    f"<div style='background:rgba(0,18,6,0.8); border:1px solid #00ff5030;"
                    f"border-radius:8px; padding:9px; text-align:center; color:#7deeaa;"
                    f"font-weight:700; font-size:0.85rem; margin-top:1px;'>"
                    f"🛒 商品を見る・購入する</div></a>",
                    unsafe_allow_html=True
                )
        with b3:
            if st.button("📊 詳しく計算", key=f"dc_{int(bp)}_{item['name'][:5]}",
                         use_container_width=True):
                st.session_state['check_buy_val']  = int(bp)
                st.session_state['check_sell_val'] = int(sp)
                st.session_state['page_override']  = '💰 もうかる？'
                st.rerun()

        if st.session_state.get(_rec_key):
            st.success("✅ 記録しました！　次は右の「🛒 商品を見る・購入する」で購入してください")

        listing_panel(
            item_name=item['name'],
            buy_price=float(bp),
            suggest_sell=float(sp),
            key_prefix=f"rec_{int(bp)}_{item['name'][:6]}",
            source_url=item.get('url', ''),
        )
        st.markdown("<div style='height:2px'></div>", unsafe_allow_html=True)

    st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
    if st.button("🔄 もう一度検索する", use_container_width=True):
        st.rerun()


# ============================================================
# 📋 登録ガイド
# ============================================================
def show_registration_guide():

    PLATFORMS = [
        # ── 仕入れサイト ──
        {
            "category": "📥 仕入れサイト（買う側）",
            "desc": "商品を安く仕入れるために登録するサイトです",
            "items": [
                {
                    "name": "メルカリ",
                    "emoji": "🏪",
                    "priority": "★★★ 最優先",
                    "priority_color": "#00ff80",
                    "free": True,
                    "what": "スマホ番号・メールアドレス",
                    "need_bank": False,
                    "need_id": False,
                    "time": "5分",
                    "point": "ダウンロード数No.1。仕入れにも販売にも使える。",
                    "url": "https://jp.mercari.com/",
                    "sell": True,
                },
                {
                    "name": "Yahoo!オークション",
                    "emoji": "🔨",
                    "priority": "★★★ 最優先",
                    "priority_color": "#00ff80",
                    "free": True,
                    "what": "Yahoo! JAPAN ID（無料）",
                    "need_bank": False,
                    "need_id": False,
                    "time": "10分",
                    "point": "日本最大のオークションサイト。掘り出し物が多い。",
                    "url": "https://auctions.yahoo.co.jp/",
                    "sell": True,
                },
                {
                    "name": "ラクマ",
                    "emoji": "🛍️",
                    "priority": "★★ 優先",
                    "priority_color": "#ffcc44",
                    "free": True,
                    "what": "楽天ID（無料）",
                    "need_bank": False,
                    "need_id": False,
                    "time": "5分",
                    "point": "手数料6%と安め。メルカリより安い商品が多いことも。",
                    "url": "https://fril.jp/",
                    "sell": True,
                },
                {
                    "name": "PayPayフリマ",
                    "emoji": "💛",
                    "priority": "★★ 優先",
                    "priority_color": "#ffcc44",
                    "free": True,
                    "what": "Yahoo! JAPAN ID（無料）",
                    "need_bank": False,
                    "need_id": False,
                    "time": "5分",
                    "point": "手数料5%。ヤフオクとID共通で使える。",
                    "url": "https://paypayfleamarket.yahoo.co.jp/",
                    "sell": True,
                },
                {
                    "name": "ジモティー",
                    "emoji": "📍",
                    "priority": "★★ 優先",
                    "priority_color": "#ffcc44",
                    "free": True,
                    "what": "メールアドレスまたはSNS",
                    "need_bank": False,
                    "need_id": False,
                    "time": "3分",
                    "point": "手数料0円！無料・格安で商品をもらえることも。地元限定。",
                    "url": "https://jmty.jp/",
                    "sell": True,
                },
                {
                    "name": "eBay（海外仕入れ）",
                    "emoji": "🌏",
                    "priority": "★ 余裕があれば",
                    "priority_color": "#888",
                    "free": True,
                    "what": "メール・クレジットカード・PayPal",
                    "need_bank": False,
                    "need_id": False,
                    "time": "20分",
                    "point": "世界190カ国から仕入れ可能。海外限定品が安く買える。英語が少し必要。",
                    "url": "https://www.ebay.com/",
                    "sell": False,
                },
            ]
        },
        # ── 販売サイト ──
        {
            "category": "📤 販売サイト（売る側）",
            "desc": "商品を高く売るために登録するサイトです。本人確認が必要な場合があります",
            "items": [
                {
                    "name": "メルカリ（販売）",
                    "emoji": "🏪",
                    "priority": "★★★ 最優先",
                    "priority_color": "#00ff80",
                    "free": True,
                    "what": "スマホ番号・本人確認（運転免許証など）・銀行口座",
                    "need_bank": True,
                    "need_id": True,
                    "time": "15〜30分",
                    "point": "購入者数が最も多い。売れやすさNo.1。まずここから始めよう。",
                    "url": "https://jp.mercari.com/",
                    "sell": True,
                },
                {
                    "name": "Yahoo!オークション（出品）",
                    "emoji": "🔨",
                    "priority": "★★★ 最優先",
                    "priority_color": "#00ff80",
                    "free": False,
                    "what": "Yahoo! JAPAN ID・本人確認・銀行口座・月498円（プレミアム）",
                    "need_bank": True,
                    "need_id": True,
                    "time": "30分",
                    "point": "コレクター品・ブランド品が高値で売れやすい。落札手数料8.8%。",
                    "url": "https://auctions.yahoo.co.jp/",
                    "sell": True,
                },
                {
                    "name": "Amazon（出品）",
                    "emoji": "📦",
                    "priority": "★★ 優先",
                    "priority_color": "#ffcc44",
                    "free": False,
                    "what": "メール・クレジットカード・銀行口座・本人確認書類・月4,900円 or 個別100円",
                    "need_bank": True,
                    "need_id": True,
                    "time": "1〜3日（審査あり）",
                    "point": "本・ゲーム・家電が定価に近い価格で売れる。審査あり。",
                    "url": "https://sellercentral.amazon.co.jp/",
                    "sell": True,
                },
                {
                    "name": "ラクマ（販売）",
                    "emoji": "🛍️",
                    "priority": "★★ 優先",
                    "priority_color": "#ffcc44",
                    "free": True,
                    "what": "楽天ID・本人確認・銀行口座",
                    "need_bank": True,
                    "need_id": True,
                    "time": "20分",
                    "point": "手数料6%と安い。楽天ポイントで支払う買い手が多い。",
                    "url": "https://fril.jp/",
                    "sell": True,
                },
            ]
        },
        # ── あると便利 ──
        {
            "category": "🔧 あると便利なサービス",
            "desc": "必須ではないけど、あると物販がもっと楽になります",
            "items": [
                {
                    "name": "PayPay（決済）",
                    "emoji": "💛",
                    "priority": "★★ 優先",
                    "priority_color": "#ffcc44",
                    "free": True,
                    "what": "スマホ番号・銀行口座またはクレカ",
                    "need_bank": False,
                    "need_id": False,
                    "time": "10分",
                    "point": "PayPayフリマとの連携・メルカリ支払いにも使える。",
                    "url": "https://paypay.ne.jp/",
                    "sell": False,
                },
                {
                    "name": "楽天カード（仕入れ用クレカ）",
                    "emoji": "💳",
                    "priority": "★ 余裕があれば",
                    "priority_color": "#888",
                    "free": True,
                    "what": "本人情報・年収・銀行口座（審査あり）",
                    "need_bank": True,
                    "need_id": False,
                    "time": "1〜2週間（審査）",
                    "point": "仕入れをカード払いにするとポイントが貯まる。ポイントも利益になる。",
                    "url": "https://card.rakuten.co.jp/",
                    "sell": False,
                },
                {
                    "name": "住信SBIネット銀行",
                    "emoji": "🏦",
                    "priority": "★ 余裕があれば",
                    "priority_color": "#888",
                    "free": True,
                    "what": "本人確認書類（マイナンバーカードなど）",
                    "need_bank": False,
                    "need_id": True,
                    "time": "1週間（郵送）",
                    "point": "各フリマサイトへの振込手数料が安い。物販専用口座として使うと便利。",
                    "url": "https://www.netbk.co.jp/",
                    "sell": False,
                },
            ]
        },
    ]

    st.markdown("""
    <div style="text-align:center; padding:4px 0 14px;">
        <div style="font-size:1.4rem; font-weight:900; color:#00ff80;">📋 会員登録ガイド</div>
        <div style="color:#88bb99; font-size:0.88rem; margin-top:4px;">
            物販を始めるために必要なサイトへの登録をまとめました
        </div>
    </div>
    """, unsafe_allow_html=True)

    # 進捗チェックリスト（session_stateで管理）
    if 'reg_checks' not in st.session_state:
        st.session_state['reg_checks'] = {}

    all_items = [item for cat in PLATFORMS for item in cat['items']]
    done = sum(1 for item in all_items if st.session_state['reg_checks'].get(item['name'], False))
    total = len(all_items)
    pct = int(done / total * 100) if total > 0 else 0

    bar_color = "#00ff80" if pct == 100 else ("#ffcc44" if pct >= 50 else "#ff6644")
    st.markdown(f"""
    <div style="background:rgba(0,12,4,0.9); border:1px solid #00ff5033;
                border-radius:12px; padding:14px 18px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="color:#e8f5eb; font-weight:800;">登録の進み具合</span>
            <span style="color:{bar_color}; font-weight:900; font-family:'Share Tech Mono',monospace;">
                {done} / {total} 完了　{pct}%
            </span>
        </div>
        <div style="background:rgba(0,0,0,0.4); border-radius:6px; height:10px; overflow:hidden;">
            <div style="background:linear-gradient(90deg,{bar_color},{bar_color}aa);
                        width:{pct}%; height:100%; border-radius:6px;
                        transition:width 0.5s;"></div>
        </div>
        <div style="color:#4aaa6a; font-size:0.78rem; margin-top:6px;">
            {"🎉 全部完了！物販の準備はバッチリです！" if pct==100 else "まずは★★★のサイトから登録しましょう"}
        </div>
    </div>
    """, unsafe_allow_html=True)

    for cat_data in PLATFORMS:
        st.markdown(f"""
        <div style="font-size:1rem; font-weight:900; color:#e8f5eb; margin:16px 0 4px;">
            {cat_data['category']}
        </div>
        <div style="color:#6aaa88; font-size:0.82rem; margin-bottom:10px;">
            {cat_data['desc']}
        </div>
        """, unsafe_allow_html=True)

        for item in cat_data['items']:
            checked = st.session_state['reg_checks'].get(item['name'], False)
            bg     = "rgba(0,35,12,0.8)" if checked else "rgba(0,12,4,0.85)"
            border = "#00ff80" if checked else "#00ff5030"
            pc     = item['priority_color']

            # チェックボックス
            new_check = st.checkbox(
                f"{'✅' if checked else '⬜'} {item['emoji']} **{item['name']}** — 登録済み",
                value=checked, key=f"chk_{item['name']}"
            )
            st.session_state['reg_checks'][item['name']] = new_check

            st.markdown(f"""
            <div style="background:{bg}; border:1px solid {border};
                        border-radius:12px; padding:14px 16px; margin-bottom:10px; margin-top:-6px;">
                <div style="display:flex; justify-content:space-between; align-items:center;
                            flex-wrap:wrap; gap:6px; margin-bottom:10px;">
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <span style="background:rgba(0,0,0,0.3); border:1px solid {pc}55;
                                     color:{pc}; padding:2px 10px; border-radius:20px;
                                     font-size:0.78rem; font-weight:700;">
                            {item['priority']}
                        </span>
                        {'<span style="background:rgba(0,30,10,0.6); border:1px solid #00ff5033; color:#00ff80; padding:2px 10px; border-radius:20px; font-size:0.78rem; font-weight:700;">無料</span>' if item['free'] else '<span style="background:rgba(30,10,0,0.6); border:1px solid #ff660033; color:#ff9944; padding:2px 10px; border-radius:20px; font-size:0.78rem; font-weight:700;">有料</span>'}
                        <span style="color:#6aaa88; font-size:0.78rem;">⏱ 約{item['time']}</span>
                    </div>
                </div>
                <div style="color:#d8f0de; font-size:0.88rem; margin-bottom:8px; line-height:1.6;">
                    💡 {item['point']}
                </div>
                <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:0.8rem;">
                    <div style="color:#6aaa88;">
                        📋 必要なもの: <span style="color:#b8dcc4;">{item['what']}</span>
                    </div>
                </div>
                {'<div style="margin-top:6px; font-size:0.78rem;"><span style="background:rgba(0,0,40,0.5); color:#88aaff; padding:2px 8px; border-radius:6px;">🏦 銀行口座が必要</span></div>' if item['need_bank'] else ''}
                {'<div style="margin-top:4px; font-size:0.78rem;"><span style="background:rgba(20,0,0,0.5); color:#ffaaaa; padding:2px 8px; border-radius:6px;">🪪 本人確認書類が必要（運転免許証・マイナンバーカードなど）</span></div>' if item['need_id'] else ''}
            </div>
            """, unsafe_allow_html=True)

            if st.button(f"🔗 {item['name']} の登録ページを開く",
                         key=f"url_{item['name']}", use_container_width=False):
                st.markdown(f"""
                <script>window.open('{item['url']}', '_blank');</script>
                """, unsafe_allow_html=True)
                st.info(f"👆 開かない場合は直接アクセス: {item['url']}")

    # まとめ
    st.markdown("""
    <div style="background:rgba(0,18,6,0.9); border:1px solid #00ff5044;
                border-radius:14px; padding:18px 20px; margin-top:16px;">
        <div style="color:#00ff80; font-size:1rem; font-weight:900; margin-bottom:12px;">
            🚀 まず最初にやること（30分でできる）
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="color:#e8f5eb; font-size:0.9rem; line-height:1.8;">
                <b style="color:#00ff80;">1.</b> 📱 <b>メルカリ</b>に登録 → スマホアプリをダウンロードして電話番号で登録<br>
                <b style="color:#00ff80;">2.</b> 🔨 <b>Yahoo! JAPAN ID</b>を作る → ヤフオクもPayPayフリマもこれ1つでOK<br>
                <b style="color:#00ff80;">3.</b> 🏦 <b>銀行口座</b>をメルカリに登録 → 売上を受け取るために必要<br>
                <b style="color:#00ff80;">4.</b> 🪪 <b>本人確認</b>を完了 → 運転免許証かマイナンバーカードで<br>
                <b style="color:#00ff80;">5.</b> 🔍 <b>このアプリ</b>で儲かる商品を探して仕入れ → あとは出品するだけ！
            </div>
        </div>
        <div style="color:#2a6a3a; font-size:0.8rem; margin-top:12px;">
            ※ 銀行口座と本人確認は販売（売る）ために必要です。買うだけなら不要な場合も多いです。
        </div>
    </div>
    """, unsafe_allow_html=True)


# ============================================================
# ルーティング
# ============================================================
# ページ遷移オーバーライド（ルートページからの検索引き継ぎ）
if st.session_state.get('page_override'):
    page = st.session_state.pop('page_override')

if   "おすすめ" in page: show_recommend()
elif "もうかる" in page: show_check()
elif "ルート"   in page: show_routes()
elif "探す"     in page: show_search()
elif "AI監視"   in page: show_monitor()
elif "成績"     in page: show_dashboard()
elif "在庫"     in page: show_inventory()
elif "登録"     in page: show_registration_guide()
elif "設定"     in page: show_settings()
