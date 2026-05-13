"use client";

import { useState, useMemo } from "react";
import {
  PREFECTURES,
  SIZE_CODES,
  estimateShippingDetailed,
  availableFromZones,
  PREFECTURE_TO_YAMATO_ZONE,
  type Prefecture,
  type SizeCode,
  type Carrier,
} from "@/lib/shipping-rates-detailed";

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "20px 24px",
};

const inp: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  padding: "10px 12px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

const lbl: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-3)",
  fontWeight: 600,
  display: "block",
  marginBottom: 6,
};

export default function ShippingCalcPage() {
  const [carrier, setCarrier] = useState<Carrier>("yamato");
  const [fromPref, setFromPref] = useState<Prefecture>("東京");
  const [toPref, setToPref] = useState<Prefecture>("大阪");
  const [size, setSize] = useState<SizeCode>("60");

  const result = useMemo(
    () => estimateShippingDetailed({ carrier, size, fromPref, toPref }),
    [carrier, size, fromPref, toPref]
  );

  const availableZones = useMemo(() => availableFromZones(carrier), [carrier]);
  const fromZone = PREFECTURE_TO_YAMATO_ZONE[fromPref];
  const toZone = PREFECTURE_TO_YAMATO_ZONE[toPref];
  const isFromZoneAvailable = availableZones.includes(fromZone);

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", margin: 0 }}>
        配送料金計算（発地・着地別）
      </h1>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 24, marginTop: 3 }}>
        ヤマト宅急便の2025年10月改定運賃に基づく実料金計算（関東発のみ実装）
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* 入力 */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
            配送条件
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={lbl}>配送会社</label>
              <select
                style={inp}
                value={carrier}
                onChange={e => setCarrier(e.target.value as Carrier)}
              >
                <option value="yamato">ヤマト宅急便</option>
                <option value="sagawa" disabled>佐川急便（準備中）</option>
                <option value="japanpost" disabled>ゆうパック（準備中）</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={lbl}>発地（都道府県）</label>
                <select
                  style={inp}
                  value={fromPref}
                  onChange={e => setFromPref(e.target.value as Prefecture)}
                >
                  {PREFECTURES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                  ゾーン: {fromZone}
                </div>
              </div>
              <div>
                <label style={lbl}>着地（都道府県）</label>
                <select
                  style={inp}
                  value={toPref}
                  onChange={e => setToPref(e.target.value as Prefecture)}
                >
                  {PREFECTURES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                  ゾーン: {toZone}
                </div>
              </div>
            </div>

            <div>
              <label style={lbl}>サイズ（三辺合計）</label>
              <select
                style={inp}
                value={size}
                onChange={e => setSize(e.target.value as SizeCode)}
              >
                {SIZE_CODES.map(s => (
                  <option key={s} value={s}>{s}サイズ（3辺合計{s}cm以内）</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 結果 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {result ? (
            <>
              <div style={{ ...card, textAlign: "center", padding: "32px 24px" }}>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
                  実料金（税込）
                </div>
                <div style={{
                  fontSize: 56,
                  fontWeight: 900,
                  color: "var(--blue)",
                  fontFamily: "ui-monospace, monospace",
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}>
                  ¥{result.fee.toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 14, fontWeight: 600 }}>
                  {result.method}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
                  {result.note}
                </div>
              </div>

              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 10 }}>
                  この料金の使い方
                </div>
                <ul style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
                  <li>正規運賃料金。営業所持込で1個につき¥100割引</li>
                  <li>クロネコメンバーズ割引・デジタル割は別途適用可</li>
                  <li>クール便・空輸料は加算なし</li>
                </ul>
              </div>
            </>
          ) : (
            <div style={{ ...card, textAlign: "center", padding: 60, color: "var(--text-3)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2)", marginBottom: 8 }}>
                料金データ未対応の組み合わせです
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                現状は<strong style={{ color: "var(--blue)" }}>関東発</strong>のヤマト宅急便のみ実装。
                <br />
                {!isFromZoneAvailable && `${fromZone}発は次回追加予定です。`}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ ...card, marginTop: 20, background: "var(--surface-2)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          実装ステータス
        </div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
          ✅ ヤマト宅急便・関東発（12着地 × 8サイズ = 96料金）<br />
          🔜 ヤマト他発地（北海道・関西・九州など 11発地分）<br />
          🔜 佐川急便（飛脚宅配便・ラージサイズ）<br />
          🔜 日本郵便（ゆうパック）<br />
          🔜 calculator/scanner ページへの統合
        </div>
      </div>
    </div>
  );
}
