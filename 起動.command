#!/bin/bash
cd "$(dirname "$0")"

# ─── 色設定 ───────────────────────────────
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  💰 物販チェッカー（グローバル版）起動中...  ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ─── Python パッケージ確認 ────────────────
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}必要なPythonパッケージをインストール中...${NC}"
    pip3 install fastapi uvicorn requests beautifulsoup4 2>/dev/null
fi

# ─── Node.js 確認 ─────────────────────────
if ! command -v node &>/dev/null; then
    echo "❌ Node.js がインストールされていません"
    echo "   https://nodejs.org からインストールしてください"
    read -p "Enterキーで終了..."
    exit 1
fi

# ─── フロントエンド依存確認 ───────────────
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}初回セットアップ: npm install 実行中...${NC}"
    cd frontend && npm install --silent && cd ..
fi

# ─── 古いプロセス停止 ─────────────────────
pkill -f "uvicorn api:app" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 1

# ─── バックエンド起動（ポート8000）────────
echo -e "${CYAN}▶ APIサーバー起動中 (port 8000)...${NC}"
python3 -m uvicorn api:app --host 0.0.0.0 --port 8000 > /tmp/bussan_api.log 2>&1 &
BACKEND_PID=$!

# ─── フロントエンド起動（ポート3000）────────
echo -e "${CYAN}▶ フロントエンド起動中 (port 3000)...${NC}"
cd frontend
npm run dev > /tmp/bussan_front.log 2>&1 &
FRONTEND_PID=$!
cd ..

# ─── 起動待ち（最大20秒）──────────────────
echo -ne "  起動確認中"
for i in $(seq 1 20); do
    sleep 1
    echo -ne "."
    API_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/dashboard 2>/dev/null)
    FRONT_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
    if [ "$API_OK" = "200" ] && [ "$FRONT_OK" = "200" ]; then
        break
    fi
done
echo ""

# ─── ローカルIP取得 ───────────────────────
LOCAL_IP=$(python3 -c "import socket; s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.connect(('8.8.8.8',80)); print(s.getsockname()[0])" 2>/dev/null || echo "不明")

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ 起動完了！${NC}"
echo ""
echo -e "  💻 このパソコンから:"
echo -e "     ${CYAN}http://localhost:3000${NC}"
echo ""
echo -e "  📱 スマホ・タブレットから（同じWi-Fi）:"
echo -e "     ${CYAN}http://${LOCAL_IP}:3000${NC}"
echo ""
echo -e "  🌍 グローバル物販チェッカー:"
echo -e "     ${CYAN}http://localhost:3000/global${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  終了するには ${YELLOW}Ctrl+C${NC} を押してください"
echo ""

# ─── QRコード（任意）─────────────────────
python3 -c "
try:
    import qrcode
    url = 'http://${LOCAL_IP}:3000'
    qr = qrcode.QRCode(border=1)
    qr.add_data(url)
    qr.make(fit=True)
    print('  📱 スマホでQRコードを読み取ってください:')
    print()
    qr.print_ascii(invert=True)
except:
    pass
" 2>/dev/null

# ─── ブラウザで開く ───────────────────────
sleep 1
open "http://localhost:3000" 2>/dev/null

# ─── 終了処理 ─────────────────────────────
trap "
    echo ''
    echo '停止中...'
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    pkill -f 'uvicorn api:app' 2>/dev/null
    pkill -f 'next dev' 2>/dev/null
    echo '終了しました。'
    exit 0
" EXIT INT TERM

wait $BACKEND_PID $FRONTEND_PID
