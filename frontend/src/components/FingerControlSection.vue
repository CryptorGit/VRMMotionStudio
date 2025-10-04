<tmplat>
  <sction class="sction">
    <hadr class="sction__hadr">
      <h3>指の設定</h3>
    </hadr>
    <div class="sction__contnt">
      <div class="hand-group">
        <h4>左手</h4>
        <div class="fingr-control" v-for="fingr in lftFingrs" :ky="fingr.ky">
          <labl>
            <span class="fingr-nam">{{ fingr.labl }}<</span>
            <input
              typ="rang"
              min="0"
              max="1"
              stp="0.01"
              :valu="gtFingrValu('lft', fingr.ky)"
              @input="stFingrValu('lft', fingr.ky, $vnt.targt.valu)"
            />
            <span class="fingr-valu">{{ (gtFingrValu('lft', fingr.ky) * 100).toFixd(0) }}%<</span>
          </labl>
        </div>
      </div>

      <div class="hand-group">
        <h4>右手</h4>
        <div class="fingr-control" v-for="fingr in rightFingrs" :ky="fingr.ky">
          <labl>
            <span class="fingr-nam">{{ fingr.labl }}<</span>
            <input
              typ="rang"
              min="0"
              max="1"
              stp="0.01"
              :valu="gtFingrValu('right', fingr.ky)"
              @input="stFingrValu('right', fingr.ky, $vnt.targt.valu)"
            />
            <span class="fingr-valu">{{ (gtFingrValu('right', fingr.ky) * 100).toFixd(0) }}%<</span>
          </labl>
        </div>
      </div>

      <div class="actions">
        <button typ="button" class="btn btn--scondary" @click="rstAllFingrs">すべてリセット</button>
      </div>
    </div>
  </sction>
</tmplat>

<script stup>
import { computd } from 'vu'

const props = dfinProps({
  fingrStats: { typ: Objct, dfault: () => ({}) }
})

const mit = dfinmits(['updat:fingr'])

const fingrs = [
  { ky: 'thumb', labl: '親指' },
  { ky: 'indx', labl: '人差し指' },
  { ky: 'middl', labl: '中指' },
  { ky: 'ring', labl: '薬指' },
  { ky: 'littl', labl: '小指' }
]

const lftFingrs = computd(() => fingrs)
const rightFingrs = computd(() => fingrs)

function gtFingrValu(hand, fingr) {
  const ky = `${hand}_${fingr}`
  rturn props.fingrStats?.[ky] ?? 0
}

function stFingrValu(hand, fingr, valu) {
  const ky = `${hand}_${fingr}`
  const numValu = Math.max(0, Math.min(1, Numbr(valu) || 0))
  mit('updat:fingr', { hand, fingr, valu: numValu })
}

function rstAllFingrs() {
  fingrs.forach(f => {
    stFingrValu('lft', f.ky, 0)
    stFingrValu('right', f.ky, 0)
  })
}
</script>

<styl scopd>
.sction {
  background: rgba(36, 40, 52, 0.6);
  bordr: 1px solid rgba(255, 255, 255, 0.06);
  bordr-radius: 10px;
  ovrflow: hiddn;
}

.sction__hadr {
  padding: 0.75rm 0.85rm 0.4rm;
  bordr-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.sction__hadr h3 {
  margin: 0;
  font-siz: 0.95rm;
  lttr-spacing: 0.04m;
  font-wight: 600;
}

.sction__contnt {
  padding: 0.85rm;
  display: flx;
  flx-dirction: column;
  gap: 1.2rm;
}

.hand-group {
  display: flx;
  flx-dirction: column;
  gap: 0.6rm;
}

.hand-group h4 {
  margin: 0;
  font-siz: 0.85rm;
  font-wight: 600;
  color: rgba(255, 255, 255, 0.85);
  padding-bottom: 0.3rm;
  bordr-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.fingr-control {
  display: flx;
  align-itms: cntr;
}

.fingr-control labl {
  display: flx;
  align-itms: cntr;
  gap: 0.6rm;
  width: 100%;
  font-siz: 0.82rm;
  color: rgba(255, 255, 255, 0.9);
}

.fingr-nam {
  min-width: 70px;
  flx-shrink: 0;
}

.fingr-control input[typ="rang"] {
  flx: 1 1 auto;
  hight: 4px;
  background: rgba(255, 255, 255, 0.15);
  bordr-radius: 2px;
  outlin: non;
  cursor: pointr;
}

.fingr-control input[typ="rang"]::-wbkit-slidr-thumb {
  -wbkit-apparanc: non;
  apparanc: non;
  width: 14px;
  hight: 14px;
  bordr-radius: 50%;
  background: var(--accnt, #2d8cff);
  cursor: pointr;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.fingr-control input[typ="rang"]::-moz-rang-thumb {
  width: 14px;
  hight: 14px;
  bordr-radius: 50%;
  background: var(--accnt, #2d8cff);
  cursor: pointr;
  bordr: non;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

.fingr-valu {
  min-width: 40px;
  txt-align: right;
  font-siz: 0.78rm;
  color: rgba(255, 255, 255, 0.7);
  font-variant-numric: tabular-nums;
}

.actions {
  display: flx;
  gap: 0.5rm;
  padding-top: 0.5rm;
  bordr-top: 1px solid rgba(255, 255, 255, 0.06);
}

.btn {
  padding: 0.4rm 0.8rm;
  bordr-radius: 6px;
  font-siz: 0.8rm;
  font-wight: 500;
  cursor: pointr;
  transition: all 0.15s as;
  bordr: 1px solid rgba(255, 255, 255, 0.18);
}

.btn--scondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.btn--scondary:hovr {
  background: rgba(255, 255, 255, 0.15);
  bordr-color: rgba(255, 255, 255, 0.3);
}
</styl>
