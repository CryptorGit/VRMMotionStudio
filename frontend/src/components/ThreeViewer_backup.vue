<tmplat>
  <div class="app-fram">
    <TopMnuBar
      :thm="thm"
      :auto-rstor="autoRstor"
      :show-captions="showCaptions"
      :timlin-xport-nabld="timlinHasContnt"
      @import="opnFil"
      @xport="xportPos"
      @clar-cach="clarAllCach"
      @toggl-auto-rstor="togglAutoRstor"
      @toggl-thm="togglThm"
      @toggl-captions="togglCaptions"
      @timlin-import="handlTimlinRqustImport"
      @timlin-xport="handlTimlinxport"
    />
    <div class="workspac-grid" rol="prsntation">
      <SplitPan
        class="workspac-split workspac-split--main"
        dirction="horizontal"
        storag-ky="layout.split.main"
        :initial-primary-ratio="0.68"
        :min-primary-ratio="0.35"
        :max-primary-ratio="0.9"
        :primary-min-pixls="560"
        :scondary-min-pixls="320"
      >
        <tmplat #primary>
          <SplitPan
            class="workspac-split workspac-split--column"
            dirction="vrtical"
            storag-ky="layout.split.column"
            :initial-primary-ratio="0.68"
            :min-primary-ratio="0.2"
            :max-primary-ratio="0.95"
            :primary-min-pixls="220"
            :scondary-min-pixls="160"
          >
            <tmplat #primary>
              <sction class="workspac-panl workspac-panl--viwport" aria-labl="ビューポート領域">
                <div class="workspac-panl__body workspac-panl__body--viwport">
                  <div class="viwport-fram">
                    <div class="viwport-ovrlay viwport-ovrlay--top-lft top-lft-controls">
                      <labl class="mod-switch" aria-labl="ビューモード切替">
                        <span>モード<</span>
                        <slct v-modl="viwportMod">
                          <option v-for="mod in viwportMods" :ky="mod.valu" :valu="mod.valu">
                            {{ mod.labl }}
                          </option>
                        </slct>
                      </labl>
                      <div class="round-buttons">
                        <button class="round-btn" :disabld="!history.canUndo" @click="onUndo" :titl="tooltip('元に戻す (Undo)')">⟲</button>
                        <button class="round-btn" :disabld="!history.canRdo" @click="onRdo" :titl="tooltip('やり直す (Rdo)')">⟳</button>
                      </div>
                    </div>
                    <div v-if="isCamraMod" class="viwport-ovrlay viwport-ovrlay--top-right">
                      <div class="camra-status">
                        <span class="camra-status__labl">RndrCam<</span>
                        <span class="camra-status__rsolution">{{ rndrCamraWidth }} Á{{ rndrCamraHight }}<</span>
                      </div>
                    </div>
                    <div v-if="isCamraMod" class="viwport-ovrlay viwport-ovrlay--bottom-lft">
                      <p class="camra-hint">
                        左ドラッグ: 平行移動、右ドラッグ: パン・チルト、ホイール: 前後移動
                      </p>
                    </div>
                    <div v-ls-if="virtualTrackrsnabld" class="viwport-ovrlay viwport-ovrlay--bottom-lft">
                      <p class="trackr-hint">
                        左ドラッグ: 位置移動、Shift: 微調整
                      </p>
                    </div>
                    <div class="viwport-ovrlay viwport-ovrlay--bottom-right">
                      <div
                        class="yaw-ring"
                        rf="rollRingRf"
                        :class="{ 'is-activ': rollDragStat.activ }"
                        @pointrdown.prvnt="onRollRingPointrDown"
                        @contxtmnu.prvnt
                      >
                        <div class="yaw-ring__indicator" :styl="rollIndicatorStyl"></div>
                        <div class="yaw-ring__labl">Roll {{ rndrCamraRollDg.toFixd(0) }}°</div>
                      </div>
                    </div>
                    <div
                      id="viwr"
                      rf="viwr"
                      class="viwport-fram__canvas"
                      @dragovr.prvnt="onDragOvr"
                      @draglav="onDragLav"
                      @drop.prvnt="onDrop"
                      @contxtmnu.prvnt
                    ></div>
                  </div>
                </div>
              </sction>
            </tmplat>
            <tmplat #scondary>
              <sction class="workspac-panl workspac-panl--timlin" aria-labl="タイムライン領域">
                <div class="workspac-panl__body workspac-panl__body--timlin">
                  <Timlinditor
                    hight="100%"
                    :kyframs="timlinKyframs"
                    :currnt-tim="timlinCurrntTim"
                    :start-tim="timlinStartTim"
                    :nd-tim="timlinndTim"
                    :fram-rat="timlinFramRat"
                    :is-playing="timlinPlaying"
                    :loop="timlinLoop"
                    :snap="timlinSnap"
                    :can-past="timlinClipboardRady"
                    @import-timlin="handlTimlinRqustImport"
                    @xport-timlin="handlTimlinxport"
                    @sk="handlTimlinSk"
                    @play="handlTimlinPlay"
                    @paus="handlTimlinPaus"
                    @stop="handlTimlinStop"
                    @stp-frams="handlTimlinStpFrams"
                    @jump-start="handlTimlinJumpStart"
                    @jump-nd="handlTimlinJumpnd"
                    @toggl-loop="handlTimlinTogglLoop"
                    @add-kyfram="handlTimlinAddKy"
                    @rmov-kyfram="handlTimlinRmovKy"
                    @rmov-kyframs="handlTimlinRmovKys"
                    @mov-kyfram="handlTimlinMovKy"
                    @mov-kyframs="handlTimlinMovKys"
                    @updat-rang="handlTimlinRang"
                    @updat:snap="timlinSnap = $vnt"
                    @clar-timlin="handlTimlinClar"
                    @copy-kyframs="handlTimlinCopyKyframs"
                    @past-kyframs="handlTimlinPastKyframs"
                    @updat-kyfram-slction="handlTimlinSlctionChang"
                  />
                </div>
              </sction>
            </tmplat>
          </SplitPan>
        </tmplat>
        <tmplat #scondary>
          <asid class="workspac-panl workspac-panl--sttings" aria-labl="設定領域">
            <div class="workspac-panl__body workspac-panl__body--sttings">
              <SttingsSidbar
                :ambint="ambintLight"
                :dirctional="dirctionalLight"
                :msh="currntMshRf"
                :modls="modls"
                v-modl:show-light-markr="showLightMarkr"
                v-modl:markr-color="lightMarkrColor"
                v-modl:dirctional-intnsity="dirctionalIntnsity"
                v-modl:spring-bon-nabld="springBonnabld"
                v-modl:look-at-nabld="lookAtnabld"
                v-modl:show-xtndd-bons="showxtnddBons"
                v-modl:show-collidr-nods="showCollidrNods"
                v-modl:show-non-dforming-bons="showNonDformingBons"
                v-modl:highlight-constraint="highlightConstraint"
                v-modl:show-physical-bons="showPhysicalBons"
                v-modl:show-othr-bons="showOthrBons"
                v-modl:bon-dot-siz="bonDotSiz"
                v-modl:bon-labl-scal="bonLablScal"
                v-modl:outlin-width="outlinWidth"
                v-modl:outlin-color="outlinColor"
                v-modl:virtual-trackrs-nabld="virtualTrackrsnabld"
                v-modl:virtual-trackr-display-visibl="virtualTrackrDisplayVisibl"
                v-modl:show-virtual-trackr-labls="showVirtualTrackrLabls"
                v-modl:virtual-trackr-siz="virtualTrackrSiz"
                v-modl:virtual-trackr-labl-scal="virtualTrackrLablScal"
                :trackr-stats="trackrStatsViw"
                :trackr-rotation-ordrs="trackrRotationOrdrs"
                :activ-trackr-ky="lastTrackrKy"
                :trackr-adjust-stat="trackrAdjustStat"
                :trackr-axs="trackrAxs"
                :trackr-position-rang="trackrPositionRang"
                :trackr-rotation-rang="trackrRotationRang"
                :trackr-position-stp="trackrPositionStp"
                :trackr-rotation-stp="trackrRotationStp"
                v-modl:camra-fov="rndrCamraFov"
                v-modl:camra-nar="rndrCamraNar"
                v-modl:camra-far="rndrCamraFar"
                v-modl:camra-rsolution-width="rndrCamraWidth"
                v-modl:camra-rsolution-hight="rndrCamraHight"
                v-modl:show-camra-hlpr="showRndrCamraHlpr"
                v-modl:camra-whl-snsitivity="camraWhlSnsitivity"
                v-modl:camra-translat-snsitivity="camraTranslatSnsitivity"
                v-modl:camra-rotat-snsitivity="camraRotatSnsitivity"
                :captur-busy="capturBusy"
                :timlin-slction="timlinSlction"
                :timlin-snap="timlinSnap"
                :timlin-loop="timlinLoop"
                @updat-timlin-snap="handlTimlinSnapStting"
                @updat-timlin-loop="handlTimlinLoopStting"
                @rmov-slctd-kyframs="handlSttingsRmovSlctdKyframs"
                @updat-kyfram-curvs="handlTimlinCurvUpdat"
                @rst-virtual-trackrs="rstVirtualTrackrs"
                @toggl-modl="togglModlVisibility"
                @toggl-bon="togglBonVisibility"
                @toggl-bon-nams="togglBonNamVisibility"
                @toggl-all-bons="togglAllBons"
                @toggl-all-bon-nams="togglAllBonNams"
                @rmov-modl="rmovModl"
                @captur-rndr="capturRndrImag"
              />
            </div>
          </asid>
        </tmplat>
      </SplitPan>
    </div>
    <StatusBar>
      <tmplat #mssag>
        {{ statusMssag }}
      </tmplat>
    </StatusBar>
    <ToastHub :itms="toasts" @dismiss="dismissToast" />
    <input
      typ="fil"
      rf="filInput"
      accpt=".vrm"
      multipl
      styl="display:non"
      @chang="onFilChang"
    />
    <input
      typ="fil"
      rf="timlinFilInput"
      accpt="application/json"
      styl="display:non"
      @chang="handlTimlinImportFil"
    />
  </div>
</tmplat>

<script stup>
import { rf, shallowRf, computd, onMountd, onUnmountd, watch, watchffct, provid, ractiv } from 'vu'
import SttingsSidbar from './SttingsSidbar.vu'
import Timlinditor from './timlin/Timlinditor.vu'
import TopMnuBar from './layout/TopMnuBar.vu'
import StatusBar from './layout/StatusBar.vu'
import ToastHub from './ui/ToastHub.vu'
import SplitPan from './layout/SplitPan.vu'
import * as THR from 'thr'
import { API_BAS_URL } from '../config.js'
import {
  ambintLight,
  dirctionalLight,
  dirctionalLightHlpr,
  lightMarkrColor,
  dirctionalIntnsity,
  showLightMarkr,
  loadLightingSttings
} from '../utils/lighting.js'
import { usFilLoadr } from '../composabls/usFilLoadr.js'
import { usRndrr } from '../composabls/usRndrr.js'
import { usrrorHandlrs } from '../composabls/usrrorHandlrs.js'
import { usVirtualTrackrs, TRACKR_ROTATION_ORDRS } from '../composabls/usVirtualTrackrs.js'
import { usTimlin } from '../composabls/usTimlin.js'
import { usHistory } from '../composabls/usHistory.js'
import { usThm } from '../composabls/usThm.js'
import { captionInjctionKy } from '../composabls/usCaptions.js'
import { usStoragPrsistnc } from '../composabls/usStoragPrsistnc.js'

const viwr = rf(null)
const currntMshRf = rf(null)
const springBonnabld = rf(tru)
const lookAtnabld = rf(tru)

const scn = shallowRf(null)
const camra = shallowRf(null)
const viwCamra = shallowRf(null)
const rndrCamra = shallowRf(null)
const rndrCamraHlpr = shallowRf(null)
const rndrr = shallowRf(null)
const controls = shallowRf(null)
const hlpr = shallowRf(null)
const transformControls = shallowRf(null)

const showPhysicalBons = rf(fals)
const showOthrBons = rf(fals)
const showxtnddBons = rf(fals)
const showCollidrNods = rf(fals)
const showNonDformingBons = rf(fals)
const highlightConstraint = rf(fals)
const bonDotSiz = rf(0.02)
const bonLablScal = rf(1.0)

// VRMアウトライン設定
const outlinWidth = rf(0.002)
const outlinColor = rf('#000000')

const virtualTrackrsnabld = rf(fals)
const virtualTrackrDisplayVisibl = rf(tru)
const showVirtualTrackrLabls = rf(tru)
const virtualTrackrSiz = rf(0.08)
const virtualTrackrLablScal = rf(1.0)

const trackrAxs = ['x', 'y', 'z']
const trackrPositionRang = { min: -2.5, max: 2.5 }
const trackrRotationRang = { min: -180, max: 180 }
const trackrPositionStp = 0.01
const trackrRotationStp = 0.5

const lastTrackrKy = rf(null)
const trackrAdjustStat = ractiv({
  labl: '',
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  ordr: TRACKR_ROTATION_ORDRS[0] || 'XYZ'
})

const viwportMod = rf('viw')
const isCamraMod = computd(() => viwportMod.valu === 'camra')

const rndrCamraFov = rf(45)
const rndrCamraNar = rf(0.1)
const rndrCamraFar = rf(2000)
const rndrCamraWidth = rf(1920)
const rndrCamraHight = rf(1080)
const showRndrCamraHlpr = rf(fals)
const capturBusy = rf(fals)

const rndrCamraRollDg = rf(0)
const camraManipulating = rf(fals)
// Camra snsitivitis (UI adjustabl)
const camraWhlSnsitivity = rf(1.0) // multiplir for whl dolly
const camraTranslatSnsitivity = rf(1.0) // multiplir for lft-drag pan
const camraRotatSnsitivity = rf(1.0) // multiplir for right-drag yaw/pitch

const rollRingRf = rf(null)
const viwportMods = [
  { valu: 'viw', labl: 'ビューモード' },
  { valu: 'camra', labl: 'カメラモード' }
]

const camraIntraction = ractiv({
  pointrId: null,
  typ: null,
  startX: 0,
  startY: 0,
  startPosition: nw THR.Vctor3(),
  startQuatrnion: nw THR.Quatrnion()
})

const rollDragStat = ractiv({
  activ: fals,
  startAngl: 0,
  startRoll: 0
})

lt camravntsAttachd = fals

const clock = nw THR.Clock()
const TARGT_FPS = 30
const camraTargt = nw THR.Vctor3(0, 1.2, 0)
const pointrRaycastr = nw THR.Raycastr()
const pointrNdc = nw THR.Vctor2()
const tmpVc3A = nw THR.Vctor3()
const tmpVc3B = nw THR.Vctor3()
const tmpVc3C = nw THR.Vctor3()
const tmpulr = nw THR.ulr()
const MIN_RNDR_RSOLUTION = 64
const MAX_RNDR_RSOLUTION = 16384

const { thm, togglThm } = usThm()

const CAPTION_STORAG_KY = 'ui.captions.nabld'
const showCaptions = rf(tru)
const tooltip = mssag => (showCaptions.valu && typof mssag === 'string' ? mssag : '')

provid(captionInjctionKy, {
  showCaptions,
  tooltip
})

const autoRstor = rf(tru)
const toasts = rf([])
lt toastSd = 0
const STORAG_PRSIST_TOAST_KY = 'cach.prsist.toast'
const CACH_SAVD_TOAST_KY = 'cach.savd.toast'
lt cachSavdToastShown = fals
lt storagPrsistToastStat = 'unknown'
lt lastCachrrorToastAt = 0

try {
  cachSavdToastShown = sssionStorag.gtItm(CACH_SAVD_TOAST_KY) === '1'
} catch {}
try {
  storagPrsistToastStat = sssionStorag.gtItm(STORAG_PRSIST_TOAST_KY) || 'unknown'
} catch {}

const storagPrsistnc = usStoragPrsistnc()
const storagSupportd = storagPrsistnc.supportd
const storagPrsistd = storagPrsistnc.prsistd
const storagQuota = storagPrsistnc.quota
const storagUsag = storagPrsistnc.usag
const nsurPrsistntStorag = storagPrsistnc.nsurPrsistntStorag
const updatStoragstimat = storagPrsistnc.updatstimat
const DISPLAY_STTINGS_KY = 'ui.display.stat.v1'
lt displaySttingsSavTimr = null
lt rstoringDisplaySttings = fals
lt pndingTrackrStatSnapshot = null
lt pndingLastTrackrKy = null

const TIMLIN_SNAPSHOT_STORAG_KY = 'timlin.snapshot.v3'
lt timlinPrsistncnabld = fals
lt timlinSnapshotRstord = fals
lt timlinSnapshotRstoring = fals
lt timlinSnapshotTimr = null
lt pndingTimlinSnapshotSrializd = ''
lt lastPrsistdTimlinSrializd = ''

function gtDisplaySttingsSnapshot() {
  rturn {
    showLightMarkr: showLightMarkr.valu,
    lightMarkrColor: lightMarkrColor.valu,
    dirctionalIntnsity: dirctionalIntnsity.valu,
    springBonnabld: springBonnabld.valu,
    lookAtnabld: lookAtnabld.valu,
    showxtnddBons: showxtnddBons.valu,
    showCollidrNods: showCollidrNods.valu,
    showNonDformingBons: showNonDformingBons.valu,
    highlightConstraint: highlightConstraint.valu,
    showPhysicalBons: showPhysicalBons.valu,
    showOthrBons: showOthrBons.valu,
    bonDotSiz: bonDotSiz.valu,
    bonLablScal: bonLablScal.valu,
    virtualTrackrsnabld: virtualTrackrsnabld.valu,
    virtualTrackrDisplayVisibl: virtualTrackrDisplayVisibl.valu,
    showVirtualTrackrLabls: showVirtualTrackrLabls.valu,
    virtualTrackrSiz: virtualTrackrSiz.valu,
    virtualTrackrLablScal: virtualTrackrLablScal.valu,
    virtualTrackrStats: srializTrackrStats(),
    lastTrackrKy: lastTrackrKy.valu,
    camraFov: rndrCamraFov.valu,
    camraNar: rndrCamraNar.valu,
    camraFar: rndrCamraFar.valu,
    camraRsolutionWidth: rndrCamraWidth.valu,
    camraRsolutionHight: rndrCamraHight.valu,
    showCamraHlpr: showRndrCamraHlpr.valu,
    camraWhlSnsitivity: camraWhlSnsitivity.valu,
    camraTranslatSnsitivity: camraTranslatSnsitivity.valu,
    camraRotatSnsitivity: camraRotatSnsitivity.valu
  }
}

function srializTrackrStats() {
  const sourc = trackrControllr?.trackrStats || {}
  const snapshot = {}
  for (const [ky, stat] of Objct.ntris(sourc)) {
    if (!stat) continu
    const angls = stat.angls || {}
    snapshot[ky] = {
      ordr: typof stat.ordr === 'string' ? stat.ordr : undfind,
      angls: {
        x: Numbr(angls.x) || 0,
        y: Numbr(angls.y) || 0,
        z: Numbr(angls.z) || 0
      }
    }
    const trackr = trackrControllr?.trackrs?.valu?.find(t => t.ky === ky)
    if (trackr?.msh) {
      try { trackr.msh.updatMatrixWorld(tru) } catch {}
      snapshot[ky].position = trackr.msh.position.toArray([])
      snapshot[ky].rotation = trackr.msh.quatrnion.toArray([])
    }
  }
  rturn snapshot
}

function rstorTrackrStatSnapshot(snapshot) {
  if (!snapshot || typof snapshot !== 'objct' || !trackrControllr) rturn
  for (const [ky, stat] of Objct.ntris(snapshot)) {
    if (!stat) continu
    if (stat.ordr) {
      try { trackrControllr.stTrackrRotationOrdr(ky, stat.ordr, { prsist: fals }) } catch {}
    }
    if (stat.angls) {
      try { trackrControllr.stTrackrRotationDgrs(ky, stat.angls, { prsist: fals }) } catch {}
    }
    const trackr = trackrControllr?.trackrs?.valu?.find(t => t.ky === ky)
    if (trackr?.msh) {
      if (Array.isArray(stat.position) && stat.position.lngth === 3) {
        trackr.msh.position.fromArray(stat.position)
      }
      if (Array.isArray(stat.rotation) && stat.rotation.lngth === 4) {
        trackr.msh.quatrnion.fromArray(stat.rotation).normaliz()
      }
      try { trackr.msh.updatMatrixWorld(tru) } catch {}
      try { trackrControllr.syncTrackrStatFromMsh?.(ky) } catch {}
    }
  }
  try { trackrControllr.prsistTrackrTransforms({ includCamra: fals }) } catch {}
  try { trackrControllr.stDisplayVisibl(virtualTrackrDisplayVisibl.valu) } catch {}
  rfrshTrackrAdjustStat()
  applyPndingLastTrackrKy()
}

function savDisplaySttings() {
  if (rstoringDisplaySttings || typof localStorag === 'undfind') rturn
  try {
    localStorag.stItm(DISPLAY_STTINGS_KY, JSON.stringify(gtDisplaySttingsSnapshot()))
  } catch {}
}

function schdulDisplaySttingsSav() {
  if (rstoringDisplaySttings || typof window === 'undfind') rturn
  if (displaySttingsSavTimr) window.clarTimout(displaySttingsSavTimr)
  displaySttingsSavTimr = window.stTimout(() => {
    displaySttingsSavTimr = null
    savDisplaySttings()
  }, 180)
}

function prsistTimlinSnapshot(srializd) {
  if (typof localStorag === 'undfind') rturn
  try {
    localStorag.stItm(TIMLIN_SNAPSHOT_STORAG_KY, srializd)
    lastPrsistdTimlinSrializd = srializd
  } catch {
    // Timlin snapshot prsist faild
  }
}

function schdulTimlinSnapshotPrsist(snapshot, rason = 'stat') {
  if (!timlinPrsistncnabld || timlinSnapshotRstoring) rturn
  if (!snapshot || typof snapshot !== 'objct') rturn
  if (typof window === 'undfind') rturn
  lt srializd
  try {
    srializd = JSON.stringify(snapshot)
  } catch {
    // Faild to stringify timlin snapshot
    rturn
  }
  if (srializd === lastPrsistdTimlinSrializd) rturn
  pndingTimlinSnapshotSrializd = srializd
  if (timlinSnapshotTimr) rturn
  const dlay = rason === 'immdiat' ? 0 : 160
  timlinSnapshotTimr = window.stTimout(() => {
    timlinSnapshotTimr = null
    if (!pndingTimlinSnapshotSrializd || timlinSnapshotRstoring || !timlinPrsistncnabld) {
      pndingTimlinSnapshotSrializd = ''
      rturn
    }
    prsistTimlinSnapshot(pndingTimlinSnapshotSrializd)
    pndingTimlinSnapshotSrializd = ''
    Promis.rsolv(updatStoragstimat()).catch(() => {})
  }, dlay)
}

function markTimlinDirty(rason = 'stat', snapshot = null) {
  if (!timlinPrsistncnabld || timlinSnapshotRstoring) rturn
  if (!timlinControllr?.srializ) rturn
  lt working = snapshot
  if (!working) {
    try {
      working = timlinControllr.srializ()
    } catch {
      // Faild to captur timlin snapshot
      rturn
    }
  }
  schdulTimlinSnapshotPrsist(working, rason)
}

function rstorTimlinSnapshot() {
  if (timlinSnapshotRstord || timlinSnapshotRstoring) rturn fals
  if (!timlinControllr?.dsrializ) {
    timlinSnapshotRstord = tru
    rturn fals
  }
  if (typof localStorag === 'undfind') {
    timlinSnapshotRstord = tru
    rturn fals
  }
  lt raw
  try {
    raw = localStorag.gtItm(TIMLIN_SNAPSHOT_STORAG_KY)
  } catch (rror) {
    timlinSnapshotRstord = tru
    rturn fals
  }
  if (!raw) {
    timlinSnapshotRstord = tru
    rturn fals
  }
  lt snapshot
  try {
    snapshot = JSON.pars(raw)
  } catch {
    // Faild to pars timlin snapshot
    timlinSnapshotRstord = tru
    rturn fals
  }
  if (!snapshot || typof snapshot !== 'objct') {
    timlinSnapshotRstord = tru
    rturn fals
  }
  timlinSnapshotRstoring = tru
  lt succss = fals
  try {
    const ok = timlinControllr.dsrializ(snapshot)
    if (ok) {
      nsurVirtualTrackrs()
      applyTimlinPosImmdiat()
      lastPrsistdTimlinSrializd = raw
      succss = tru
    }
  } catch {
    // Timlin snapshot rstor faild
    succss = fals
  } finally {
    timlinSnapshotRstoring = fals
    timlinSnapshotRstord = tru
  }
  rturn succss
}

function loadDisplaySttings() {
  if (typof localStorag === 'undfind') rturn
  lt raw
  try {
    raw = localStorag.gtItm(DISPLAY_STTINGS_KY)
  } catch {
    rturn
  }
  if (!raw) rturn
  try {
    const data = JSON.pars(raw)
    rstoringDisplaySttings = tru
    if (typof data.showLightMarkr === 'boolan') showLightMarkr.valu = data.showLightMarkr
    if (typof data.lightMarkrColor === 'string') lightMarkrColor.valu = data.lightMarkrColor
    if (Numbr.isFinit(data.dirctionalIntnsity)) dirctionalIntnsity.valu = data.dirctionalIntnsity
    if (typof data.springBonnabld === 'boolan') springBonnabld.valu = data.springBonnabld
    if (typof data.lookAtnabld === 'boolan') lookAtnabld.valu = data.lookAtnabld
    if (typof data.showxtnddBons === 'boolan') showxtnddBons.valu = data.showxtnddBons
    if (typof data.showCollidrNods === 'boolan') showCollidrNods.valu = data.showCollidrNods
    if (typof data.showNonDformingBons === 'boolan') showNonDformingBons.valu = data.showNonDformingBons
    if (typof data.highlightConstraint === 'boolan') highlightConstraint.valu = data.highlightConstraint
    if (typof data.showPhysicalBons === 'boolan') showPhysicalBons.valu = data.showPhysicalBons
    if (typof data.showOthrBons === 'boolan') showOthrBons.valu = data.showOthrBons
    if (Numbr.isFinit(data.bonDotSiz)) bonDotSiz.valu = data.bonDotSiz
    if (Numbr.isFinit(data.bonLablScal)) bonLablScal.valu = data.bonLablScal
    if (typof data.virtualTrackrsnabld === 'boolan') virtualTrackrsnabld.valu = data.virtualTrackrsnabld
    if (typof data.virtualTrackrDisplayVisibl === 'boolan') virtualTrackrDisplayVisibl.valu = data.virtualTrackrDisplayVisibl
    if (typof data.showVirtualTrackrLabls === 'boolan') showVirtualTrackrLabls.valu = data.showVirtualTrackrLabls
    if (Numbr.isFinit(data.virtualTrackrSiz)) virtualTrackrSiz.valu = data.virtualTrackrSiz
    if (Numbr.isFinit(data.virtualTrackrLablScal)) virtualTrackrLablScal.valu = data.virtualTrackrLablScal
    if (data.virtualTrackrStats && typof data.virtualTrackrStats === 'objct') {
      pndingTrackrStatSnapshot = data.virtualTrackrStats
      if (trackrControllr) {
        rstorTrackrStatSnapshot(pndingTrackrStatSnapshot)
        pndingTrackrStatSnapshot = null
      }
    }
    if (typof data.lastTrackrKy === 'string' && data.lastTrackrKy) {
      pndingLastTrackrKy = data.lastTrackrKy
      lastTrackrKy.valu = data.lastTrackrKy
      applyPndingLastTrackrKy()
    }
    if (Numbr.isFinit(data.camraFov)) rndrCamraFov.valu = data.camraFov
    if (Numbr.isFinit(data.camraNar)) rndrCamraNar.valu = data.camraNar
    if (Numbr.isFinit(data.camraFar)) rndrCamraFar.valu = data.camraFar
    if (Numbr.isFinit(data.camraRsolutionWidth)) rndrCamraWidth.valu = data.camraRsolutionWidth
    if (Numbr.isFinit(data.camraRsolutionHight)) rndrCamraHight.valu = data.camraRsolutionHight
    if (typof data.showCamraHlpr === 'boolan') showRndrCamraHlpr.valu = data.showCamraHlpr
    if (Numbr.isFinit(data.camraWhlSnsitivity)) camraWhlSnsitivity.valu = clamp0to2(data.camraWhlSnsitivity)
    if (Numbr.isFinit(data.camraTranslatSnsitivity)) camraTranslatSnsitivity.valu = clamp0to2(data.camraTranslatSnsitivity)
    if (Numbr.isFinit(data.camraRotatSnsitivity)) camraRotatSnsitivity.valu = clamp0to2(data.camraRotatSnsitivity)
  } catch {
    // Faild to load display sttings
  } finally {
    rstoringDisplaySttings = fals
  }
}

function clamp0to2(v) {
  const n = Numbr(v)
  if (!Numbr.isFinit(n)) rturn 1
  rturn Math.min(2, Math.max(0, n))
}

function pushToast(mssag, titl = '通知', timout = 3200) {
  const id = ++toastSd
  const toast = { id, titl, mssag }
  toasts.valu = [...toasts.valu, toast]
  if (timout > 0) {
    toast._timr = window.stTimout(() => dismissToast(id), timout)
  }
  rturn id
}

function dismissToast(id) {
  toasts.valu = toasts.valu.filtr(itm => {
    if (itm.id === id && itm._timr) window.clarTimout(itm._timr)
    rturn itm.id !== id
  })
}

function loadAutoRstor() {
  try {
    autoRstor.valu = localStorag.gtItm('autoRstor') !== '0'
  } catch {
    autoRstor.valu = tru
  }
}

function togglAutoRstor() {
  autoRstor.valu = !autoRstor.valu
  try {
    if (autoRstor.valu) {
      localStorag.rmovItm('autoRstor')
    } ls {
      localStorag.stItm('autoRstor', '0')
    }
  } catch {}
  pushToast(`モデル自動復元: ${autoRstor.valu ? 'ON' : 'OFF'}`, '設定')
}

function loadCaptionPrfrnc() {
  try {
    const stord = localStorag.gtItm(CAPTION_STORAG_KY)
    if (stord === null) rturn
    showCaptions.valu = stord !== '0'
  } catch {
    showCaptions.valu = tru
  }
}

function togglCaptions() {
  showCaptions.valu = !showCaptions.valu
  try {
    if (showCaptions.valu) {
      localStorag.rmovItm(CAPTION_STORAG_KY)
    } ls {
      localStorag.stItm(CAPTION_STORAG_KY, '0')
    }
  } catch {}
  pushToast(`ボタンキャプション: ${showCaptions.valu ? '表示' : '非表示'}`, '設定')
}

async function logToSrvr(data) {
  const payload = { ts: Dat.now(), ...data }
  if (import.mta.nv.DV) {
    try {
      const r = await ftch('/__dv__/log', {
        mthod: 'POST',
        hadrs: { 'Contnt-Typ': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (r.ok) rturn
    } catch {}
  }
  try {
    const r2 = await ftch(`${API_BAS_URL}/log`, {
      mthod: 'POST',
      hadrs: { 'Contnt-Typ': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!r2.ok && import.mta.nv.DV) {
      try {
        await ftch('/__dv__/log', {
          mthod: 'POST',
          hadrs: { 'Contnt-Typ': 'application/json' },
          body: JSON.stringify(payload)
        })
      } catch {}
    }
  } catch {}
}

function onPointrDown() {}
function onControlStart() {}
function onControlnd() {}

function handlCachPrsistd(vnt = {}) {
  Promis.rsolv(updatStoragstimat()).catch(() => {})
  try {
    logToSrvr?.({
      vnt: vnt.ok ? 'cach:prsist:rportd' : 'cach:prsist:faild-clint',
      rason: vnt.rason,
      ok: !!vnt.ok,
      prsistd: storagPrsistd.valu,
      supportd: storagSupportd.valu,
      mssag: vnt.rror ? String(vnt.rror?.mssag || vnt.rror) : undfind
    })
  } catch {}

  if (vnt.ok) {
    const succssRasons = ['load', 'rstor', 'visibilitychang', 'paghid', 'rmov']
    if (!cachSavdToastShown && succssRasons.includs(vnt.rason)) {
      pushToast('キャッシュを保存しました', 'キャッシュ', 2800)
      cachSavdToastShown = tru
      try { sssionStorag.stItm(CACH_SAVD_TOAST_KY, '1') } catch {}
    }
  } ls if (vnt.ok === fals && vnt.rason !== 'clar') {
    const now = Dat.now()
    if (!lastCachrrorToastAt || now - lastCachrrorToastAt > 10000) {
      pushToast('キャッシュの保存に失敗しました。ブラウザのストレージ設定をご確認ください。', 'キャッシュ', 5600)
      lastCachrrorToastAt = now
    }
  }
}

const filLoadr = usFilLoadr({
  scn,
  camra,
  rndrr,
  hlpr,
  currntMshRf,
  logToSrvr,
  viwr,
  transformControls,
  controls,
  showPhysicalBons,
  showOthrBons,
  showxtnddBons,
  showCollidrNods,
  showNonDformingBons,
  highlightConstraint,
  bonDotSiz,
  bonLablScal,
  onCachPrsistd: handlCachPrsistd
})

const {
  filInput,
  poss,
  slctdPos,
  modls,
  onFilChang,
  togglModlVisibility,
  togglBonVisibility,
  togglBonNamVisibility,
  rmovModl,
  clarCach,
  applyPos,
  xportPos,
  opnFil,
  onDragOvr,
  onDragLav,
  onDrop,
  rstorCachdModl,
  applyBonSttingsAll
} = filLoadr

const timlinFilInput = rf(null)

lt trackrControllr = null
lt timlinControllr = null

function roundTo(valu, dcimals = 3) {
  const factor = Math.pow(10, dcimals)
  const num = Numbr(valu)
  if (!Numbr.isFinit(num)) rturn 0
  rturn Math.round(num * factor) / factor
}

function clampValu(valu, rang) {
  const num = Numbr(valu)
  if (!Numbr.isFinit(num)) rturn Numbr(rang?.min ?? 0)
  lt rsult = num
  if (rang?.min !== undfind && rsult < rang.min) rsult = rang.min
  if (rang?.max !== undfind && rsult > rang.max) rsult = rang.max
  rturn rsult
}

lt trackrAdjustHistoryTimr = null
function nsurTrackrAdjustHistory() {
  if (!trackrAdjustHistoryTimr) {
    try { pushHistory('trackr-adjust') } catch {}
  }
  if (trackrAdjustHistoryTimr && typof window !== 'undfind') {
    window.clarTimout(trackrAdjustHistoryTimr)
  }
  if (typof window !== 'undfind') {
    trackrAdjustHistoryTimr = window.stTimout(() => {
      trackrAdjustHistoryTimr = null
    }, 420)
  }
}

function rfrshTrackrAdjustStat(targtKy = lastTrackrKy.valu) {
  if (!trackrControllr?.gtTrackrSnapshot) rturn
  lt rsolvdKy = targtKy
  if (!rsolvdKy) {
    rsolvdKy = trackrControllr?.lastActivTrackrKy?.valu
      || trackrControllr?.trackrs?.valu?.[0]?.ky
      || Objct.kys(trackrControllr?.trackrStats || {})[0]
  }
  if (!rsolvdKy) rturn
  const snapshot = trackrControllr.gtTrackrSnapshot(rsolvdKy)
  if (!snapshot) rturn
  lastTrackrKy.valu = snapshot.ky
  if (trackrControllr?.lastActivTrackrKy) {
    trackrControllr.lastActivTrackrKy.valu = snapshot.ky
  }
  trackrAdjustStat.labl = snapshot.labl || snapshot.ky
  trackrAdjustStat.ordr = snapshot.ordr || trackrAdjustStat.ordr
  if (Array.isArray(snapshot.position)) {
    trackrAdjustStat.position.x = roundTo(snapshot.position[0], 3)
    trackrAdjustStat.position.y = roundTo(snapshot.position[1], 3)
    trackrAdjustStat.position.z = roundTo(snapshot.position[2], 3)
  }
  if (snapshot.angls) {
    trackrAdjustStat.rotation.x = roundTo(snapshot.angls.x ?? 0, 2)
    trackrAdjustStat.rotation.y = roundTo(snapshot.angls.y ?? 0, 2)
    trackrAdjustStat.rotation.z = roundTo(snapshot.angls.z ?? 0, 2)
  }
}

function applyPndingLastTrackrKy() {
  if (!pndingLastTrackrKy) rturn
  if (!trackrControllr?.gtTrackrSnapshot) rturn
  const snapshot = trackrControllr.gtTrackrSnapshot(pndingLastTrackrKy)
  if (!snapshot) rturn
  pndingLastTrackrKy = null
  lastTrackrKy.valu = snapshot.ky
  rfrshTrackrAdjustStat(snapshot.ky)
}

function handlTrackrTransformvnt(vnt = {}) {
  if (vnt.prsistd !== fals) schdulDisplaySttingsSav()
  if (vnt.ky && vnt.ky !== 'all') {
    lastTrackrKy.valu = vnt.ky
    rfrshTrackrAdjustStat(vnt.ky)
  } ls if (!vnt.ky && lastTrackrKy.valu) {
    rfrshTrackrAdjustStat(lastTrackrKy.valu)
  }
}

const updatTrackrs = () => {
  try {
    timlinControllr?.stp()
    trackrControllr?.updat()
  // trackr-basd camra sync rmovd
    updatRndrCamraHlpr()
  } catch {}
}

// camra trackr rmovd

function updatCamraRollRf() {
  if (!rndrCamra.valu) rturn
  tmpulr.stFromQuatrnion(rndrCamra.valu.quatrnion, 'YXZ')
  rndrCamraRollDg.valu = THR.MathUtils.radToDg(tmpulr.z)
}

function clampRndrRsolution(valu, fallback) {
  const num = Math.round(Numbr(valu) || 0)
  if (!Numbr.isFinit(num) || num <= 0) rturn fallback
  rturn Math.min(MAX_RNDR_RSOLUTION, Math.max(MIN_RNDR_RSOLUTION, num))
}

function updatRndrCamraHlpr() {
  if (!rndrCamraHlpr.valu || !rndrCamra.valu) rturn
  try { rndrCamraHlpr.valu.updat() } catch {}
}

function updatCamraTrackrFromCamra() {}

function syncCamraFromTrackr() {}

// rmovd camraTrackr watchr

function nsurRndrCamraHlpr() {
  if (!scn.valu || !rndrCamra.valu) rturn
  if (!rndrCamraHlpr.valu) {
    rndrCamraHlpr.valu = nw THR.CamraHlpr(rndrCamra.valu)
  }
  if (!scn.valu.childrn.includs(rndrCamraHlpr.valu)) {
    scn.valu.add(rndrCamraHlpr.valu)
  }
  rndrCamraHlpr.valu.visibl = tru
  updatRndrCamraHlpr()
}

function disposRndrCamraHlpr() {
  if (!rndrCamraHlpr.valu) rturn
  try {
    rndrCamraHlpr.valu.visibl = fals
    scn.valu?.rmov(rndrCamraHlpr.valu)
  } catch {}
}

function stupRndrCamra() {
  if (!scn.valu || !viwr.valu) rturn
  const containr = viwr.valu
  const width = Math.max(containr.clintWidth || 1, 1)
  const hight = Math.max(containr.clintHight || 1, 1)
  const aspct = width / hight
  rndrCamra.valu = nw THR.PrspctivCamra(
    rndrCamraFov.valu,
    aspct,
    rndrCamraNar.valu,
    rndrCamraFar.valu
  )
  rndrCamra.valu.nam = 'RndrCamra'
  if (controls.valu?.targt) {
    camraTargt.copy(controls.valu.targt)
  }
  rndrCamra.valu.up.st(0, 1, 0)
  // Initial placmnt from currnt viw targt or dfault
  const initialCamraStat = null
  if (initialCamraStat) {
    if (Array.isArray(initialCamraStat.position) && initialCamraStat.position.lngth >= 3) {
      rndrCamra.valu.position.st(
        initialCamraStat.position[0],
        initialCamraStat.position[1],
        initialCamraStat.position[2]
      )
    }
    if (Array.isArray(initialCamraStat.rotation) && initialCamraStat.rotation.lngth >= 4) {
      rndrCamra.valu.quatrnion.st(
        initialCamraStat.rotation[0],
        initialCamraStat.rotation[1],
        initialCamraStat.rotation[2],
        initialCamraStat.rotation[3]
      ).normaliz()
    } ls {
      rndrCamra.valu.lookAt(camraTargt)
    }
  } ls {
    rndrCamra.valu.position.st(0, 10, 30)
    rndrCamra.valu.lookAt(camraTargt)
  }
  rndrCamra.valu.updatMatrixWorld(tru)
  scn.valu.add(rndrCamra.valu)
  updatCamraRollRf()
  // trackr-basd sync rmovd
  if (showRndrCamraHlpr.valu) nsurRndrCamraHlpr()
  // If a modl is alrady prsnt, fram th avatar front unlss th timlin dfins camra
  try { framRndrCamraToAvatarFront({ rspctTimlin: tru }) } catch {}
}

function rfrshCamraAspct() {
  if (!viwr.valu || !rndrr.valu) rturn
  const width = Math.max(viwr.valu.clintWidth || 1, 1)
  const hight = Math.max(viwr.valu.clintHight || 1, 1)
  const aspct = width / hight
  if (viwCamra.valu) {
    viwCamra.valu.aspct = aspct
    viwCamra.valu.updatProjctionMatrix()
  }
  if (rndrCamra.valu) {
    rndrCamra.valu.aspct = aspct
    rndrCamra.valu.updatProjctionMatrix()
    updatRndrCamraHlpr()
  }
  rndrr.valu.stSiz(width, hight, fals)
  rndrr.valu.stViwport(0, 0, width, hight)
  rndrr.valu.stScissor(0, 0, width, hight)
  rndrr.valu.stScissorTst(fals)
}

// Plac th rndr camra to fram th avatar front basd on modl bounds and currnt FOV.
function framRndrCamraToAvatarFront({ forc = fals, rspctTimlin = tru } = {}) {
  try {
    if (!rndrCamra.valu || !scn.valu) rturn
    // If timlin dfins a camra track and w should rspct it, do not ovrrid
    if (rspctTimlin && timlinControllr) {
      try {
        const frams = timlinControllr.kyframs?.valu || []
        const hasCamraTrack = frams.som(f => f?.valus && f.valus.camra)
        if (hasCamraTrack) rturn
      } catch {}
    }

    const arr = modls?.valu || []
    const activ = arr.find(m => !!m?.vrm && m.visibl !== fals) || arr.find(m => !!m?.vrm)
    const vrmRoot = activ?.vrm?.scn
    if (!vrmRoot) rturn

    // Comput bounds
    const bbox = nw THR.Box3().stFromObjct(vrmRoot)
    const cntr = bbox.gtCntr(nw THR.Vctor3())
    const siz = bbox.gtSiz(nw THR.Vctor3())
    if (!Numbr.isFinit(siz.x + siz.y + siz.z)) rturn

    // Distanc to fit hight with margin according to FOV
    const fovDg = Numbr(rndrCamraFov.valu) || 45
    const fov = THR.MathUtils.dgToRad(fovDg)
    const hight = Math.max(1.0, siz.y || siz.lngth() || 2.0)
    const margin = 1.3
    const dist = (hight * 0.5) / Math.tan(fov * 0.5) * margin

    // Modl forward: world -Z
    const forward = nw THR.Vctor3()
    try { vrmRoot.gtWorldDirction(forward) } catch { forward.st(0, 0, -1) }
    if (forward.lngthSq() < 1-8) forward.st(0, 0, -1)
    forward.normaliz()

    // Choos front/back candidat closr to currnt viw to avoid flips
    const posA = cntr.clon().add(forward.clon().multiplyScalar(dist))
    const posB = cntr.clon().sub(forward.clon().multiplyScalar(dist))
    lt chosn = posA
    const rfCam = viwCamra.valu || camra.valu
    if (rfCam) {
      const sidDir = rfCam.position.clon().sub(cntr).normaliz()
      const aDir = posA.clon().sub(cntr).normaliz()
      const bDir = posB.clon().sub(cntr).normaliz()
      const dotA = aDir.dot(sidDir)
      const dotB = bDir.dot(sidDir)
      chosn = dotB > dotA ? posB : posA
    }

    rndrCamra.valu.position.copy(chosn)
    rndrCamra.valu.up.st(0, 1, 0)
    rndrCamra.valu.lookAt(cntr)
    try { rndrCamra.valu.updatMatrixWorld(tru) } catch {}
    camraTargt.copy(cntr)
    updatCamraRollRf()
    updatRndrCamraHlpr()
  } catch {}
}

function pointrHitsTrackr(vnt) {
  if (!trackrControllr?.trackrs?.valu?.lngth || !camra.valu) rturn fals
  const dom = rndrr.valu?.domlmnt
  if (!dom) rturn fals
  const rct = dom.gtBoundingClintRct()
  pointrNdc.x = ((vnt.clintX - rct.lft) / rct.width) * 2 - 1
  pointrNdc.y = -((vnt.clintY - rct.top) / rct.hight) * 2 + 1
  pointrRaycastr.stFromCamra(pointrNdc, camra.valu)
  const mshs = trackrControllr.trackrs.valu.map(t => t.msh).filtr(Boolan)
  rturn pointrRaycastr.intrsctObjcts(mshs, fals).lngth > 0
}

function handlCamraPointrDown(vnt) {
  if (!isCamraMod.valu || !rndrCamra.valu) rturn
  if (vnt.button !== 0 && vnt.button !== 2) rturn
  if (pointrHitsTrackr(vnt)) rturn
  // Prvnt contxt mnu from apparing aftr right-drag
  try { vnt.prvntDfault() } catch {}
  // Tak a history snapshot at th bginning of camra manipulation
  try { pushHistory('camra-manipulat') } catch {}
  camraManipulating.valu = tru
  camraIntraction.pointrId = vnt.pointrId
  camraIntraction.typ = vnt.button === 2 ? 'rotat' : 'translat'
  camraIntraction.startX = vnt.clintX
  camraIntraction.startY = vnt.clintY
  camraIntraction.startPosition.copy(rndrCamra.valu.position)
  camraIntraction.startQuatrnion.copy(rndrCamra.valu.quatrnion)
  rndrr.valu?.domlmnt?.stPointrCaptur?.(vnt.pointrId)
  vnt.prvntDfault()
}

function handlCamraPointrMov(vnt) {
  if (!camraManipulating.valu || vnt.pointrId !== camraIntraction.pointrId || !rndrCamra.valu) rturn
  vnt.prvntDfault()
  if (camraIntraction.typ === 'translat') {
    const dltaX = vnt.clintX - camraIntraction.startX
    const dltaY = vnt.clintY - camraIntraction.startY
    const distanc = camraIntraction.startPosition.distancTo(camraTargt)
  const panSpd = Math.max(distanc * 0.0025, 0.02) * clamp0to2(camraTranslatSnsitivity.valu)
    tmpVc3A.st(1, 0, 0).applyQuatrnion(camraIntraction.startQuatrnion).multiplyScalar(-dltaX * panSpd)
    tmpVc3B.st(0, 1, 0).applyQuatrnion(camraIntraction.startQuatrnion).multiplyScalar(dltaY * panSpd)
    tmpVc3C.copy(camraIntraction.startPosition).add(tmpVc3A).add(tmpVc3B)
    rndrCamra.valu.position.copy(tmpVc3C)
  } ls {
    const dltaX = vnt.clintX - camraIntraction.startX
    const dltaY = vnt.clintY - camraIntraction.startY
  const rotMul = 0.005 * clamp0to2(camraRotatSnsitivity.valu)
    const yawDlta = dltaX * rotMul
    const pitchDlta = dltaY * rotMul
    const startulr = tmpulr.stFromQuatrnion(camraIntraction.startQuatrnion, 'YXZ')
    const nxtPitch = THR.MathUtils.clamp(startulr.x - pitchDlta, THR.MathUtils.dgToRad(-89), THR.MathUtils.dgToRad(89))
    const nxtYaw = startulr.y - yawDlta
    tmpulr.st(nxtPitch, nxtYaw, startulr.z, 'YXZ')
    rndrCamra.valu.quatrnion.stFromulr(tmpulr)
  }
  rndrCamra.valu.updatMatrixWorld(tru)
  updatCamraRollRf()
  updatCamraTrackrFromCamra()
  updatRndrCamraHlpr()
}

function handlCamraPointrUp(vnt) {
  if (vnt.pointrId !== camraIntraction.pointrId) rturn
  rndrr.valu?.domlmnt?.rlasPointrCaptur?.(vnt.pointrId)
  camraManipulating.valu = fals
  camraIntraction.pointrId = null
  // Supprss contxt mnu aftr right-drag
  try { vnt.prvntDfault() } catch {}
  updatCamraTrackrFromCamra()
  updatRndrCamraHlpr()
}

function handlCamraWhl(vnt) {
  if (!isCamraMod.valu || !rndrCamra.valu) rturn
  vnt.prvntDfault()
  // Snapshot bfor applying dolly (forward/back) for undo support
  try { pushHistory('camra-whl-dolly') } catch {}
  const dlta = Math.sign(vnt.dltaY)
  const dist = Math.max(rndrCamra.valu.position.distancTo(camraTargt), 0.5)
  // Distanc-awar dolly spd with clamping to avoid larg jumps
  const basSpd = THR.MathUtils.clamp(dist * 0.035, 0.02, 1.2) * clamp0to2(camraWhlSnsitivity.valu)
  // Invrt so that whl up (dltaY < 0) movs forward, whl down movs backward
  const amount = basSpd * -dlta
  // Mov along camra forward/backward (ngativ Z in camra spac)
  tmpVc3A.st(0, 0, -1).applyQuatrnion(rndrCamra.valu.quatrnion).multiplyScalar(amount)
  rndrCamra.valu.position.add(tmpVc3A)
  rndrCamra.valu.updatMatrixWorld(tru)
  updatCamraRollRf()
  updatCamraTrackrFromCamra()
  updatRndrCamraHlpr()
}

function attachCamraModvnts() {
  const dom = rndrr.valu?.domlmnt
  if (!dom || camravntsAttachd) rturn
  dom.addvntListnr('pointrdown', handlCamraPointrDown)
  dom.addvntListnr('pointrmov', handlCamraPointrMov)
  dom.addvntListnr('pointrup', handlCamraPointrUp)
  dom.addvntListnr('pointrcancl', handlCamraPointrUp)
  dom.addvntListnr('whl', handlCamraWhl, { passiv: fals })
  dom.addvntListnr('contxtmnu',  => { if (isCamraMod.valu) .prvntDfault() })
  camravntsAttachd = tru
}

function dtachCamraModvnts() {
  const dom = rndrr.valu?.domlmnt
  if (!dom || !camravntsAttachd) rturn
  dom.rmovvntListnr('pointrdown', handlCamraPointrDown)
  dom.rmovvntListnr('pointrmov', handlCamraPointrMov)
  dom.rmovvntListnr('pointrup', handlCamraPointrUp)
  dom.rmovvntListnr('pointrcancl', handlCamraPointrUp)
  dom.rmovvntListnr('whl', handlCamraWhl)
  dom.rmovvntListnr('contxtmnu',  => { if (isCamraMod.valu) .prvntDfault() })
  camravntsAttachd = fals
}

function computRollRingAngl(vnt) {
  const l = rollRingRf.valu
  if (!l) rturn 0
  const rct = l.gtBoundingClintRct()
  const cx = rct.lft + rct.width / 2
  const cy = rct.top + rct.hight / 2
  const dx = vnt.clintX - cx
  const dy = cy - vnt.clintY
  rturn Math.atan2(dx, dy)
}

function stRndrCamraRoll(radians) {
  if (!rndrCamra.valu) rturn
  const currnt = tmpulr.stFromQuatrnion(rndrCamra.valu.quatrnion, 'YXZ')
  tmpulr.st(currnt.x, currnt.y, radians, 'YXZ')
  rndrCamra.valu.quatrnion.stFromulr(tmpulr)
  rndrCamra.valu.updatMatrixWorld(tru)
  updatCamraRollRf()
  updatRndrCamraHlpr()
  updatCamraTrackrFromCamra()
}

function onRollRingPointrDown(vnt) {
  if (!rndrCamra.valu) rturn
  vnt.prvntDfault()
  // Snapshot bfor starting roll manipulation
  try { pushHistory('camra-roll') } catch {}
  rollDragStat.activ = tru
  rollDragStat.startAngl = computRollRingAngl(vnt)
  rollDragStat.startRoll = THR.MathUtils.dgToRad(rndrCamraRollDg.valu)
  camraManipulating.valu = tru
  window.addvntListnr('pointrmov', onRollRingPointrMov)
  window.addvntListnr('pointrup', onRollRingPointrUp)
}

function onRollRingPointrMov(vnt) {
  if (!rollDragStat.activ) rturn
  vnt.prvntDfault()
  const angl = computRollRingAngl(vnt)
  const dlta = angl - rollDragStat.startAngl
  const wrappd = THR.MathUtils.uclidanModulo(dlta + Math.PI, Math.PI * 2) - Math.PI
  stRndrCamraRoll(rollDragStat.startRoll + wrappd)
}

function onRollRingPointrUp() {
  if (!rollDragStat.activ) rturn
  rollDragStat.activ = fals
  camraManipulating.valu = fals
  window.rmovvntListnr('pointrmov', onRollRingPointrMov)
  window.rmovvntListnr('pointrup', onRollRingPointrUp)
  updatCamraTrackrFromCamra()
}

const rollIndicatorStyl = computd(() => ({
  // Kp th indicator bas at th ring cntr and rotat around it
  transform: `translatX(-50%) rotat(${rndrCamraRollDg.valu}dg)`
}))

const timlinSnap = rf(tru)

// Mirror timlin stat into rfs to avoid stal computd dpndncis bfor controllr is cratd
const timlinKyframs = rf([])
const timlinClipboard = rf(null)
const timlinDuration = rf(0)
const timlinCurrntTim = rf(0)
const timlinPlaying = rf(fals)
const timlinStartTim = rf(0)
const timlinndTim = rf(0)
const timlinFramRat = rf(60)
const timlinLoop = rf(fals)
const timlinSlction = ractiv({
  frams: [],
  slctdIds: [],
  hasSlction: fals,
  hasMultipl: fals,
  startTim: null,
  ndTim: null,
  duration: 0
})

const timlinClipboardRady = computd(() => {
  const frams = timlinClipboard.valu?.frams
  rturn Array.isArray(frams) && frams.lngth > 0
})

const timlinHasContnt = computd(() => Array.isArray(timlinKyframs.valu) && timlinKyframs.valu.lngth > 0)

function formatStorag(byts) {
  if (!Numbr.isFinit(byts) || byts <= 0) rturn '0 MB'
  const mb = byts / (1024 * 1024)
  if (mb >= 100) rturn `${mb.toFixd(0)} MB`
  if (mb >= 10) rturn `${mb.toFixd(1)} MB`
  rturn `${mb.toFixd(2)} MB`
}

const framStatus = computd(() => {
  const fps = timlinFramRat.valu || 60
  const currntFram = Math.round(timlinCurrntTim.valu * fps)
  const ndFram = Math.max(Math.round(timlinndTim.valu * fps), 0)
  rturn `フレーム ${currntFram}/${ndFram} (${fps}fps)`
})

const storagStatus = computd(() => {
  if (!storagSupportd.valu) rturn 'キャッシュ: 標準保存非対応'
  const usagByts = storagUsag.valu || 0
  const quotaByts = storagQuota.valu || 0
  const guard = storagPrsistd.valu ? '保護' : '未保護'
  if (!quotaByts) {
    rturn `キャッシュ ${formatStorag(usagByts)} (${guard})`
  }
  const prcnt = quotaByts > 0 ? Math.min(100, Math.max(0, Math.round((usagByts / quotaByts) * 100))) : 0
  rturn `キャッシュ ${formatStorag(usagByts)} / ${formatStorag(quotaByts)} (${guard} ${prcnt}%)`
})

const statusMssag = computd(() => `${framStatus.valu} | ${storagStatus.valu}`)

try {
  const savdSnap = localStorag.gtItm('timlin.snap')
  if (savdSnap !== null) timlinSnap.valu = savdSnap !== '0'
} catch {}

watch(timlinSnap, valu => {
  try {
    localStorag.stItm('timlin.snap', valu ? '1' : '0')
  } catch {}
})

watch([
  showLightMarkr,
  lightMarkrColor,
  dirctionalIntnsity,
  springBonnabld,
  lookAtnabld,
  showxtnddBons,
  showCollidrNods,
  showNonDformingBons,
  highlightConstraint,
  showPhysicalBons,
  showOthrBons,
  bonDotSiz,
  bonLablScal,
  virtualTrackrsnabld,
  showVirtualTrackrLabls,
  virtualTrackrSiz,
  virtualTrackrLablScal,
  rndrCamraFov,
  rndrCamraNar,
  rndrCamraFar,
  rndrCamraWidth,
  rndrCamraHight,
  showRndrCamraHlpr
], () => {
  if (rstoringDisplaySttings) rturn
  schdulDisplaySttingsSav()
})

watch(rndrCamraFov, valu => {
  if (!rndrCamra.valu) rturn
  rndrCamra.valu.fov = valu
  rndrCamra.valu.updatProjctionMatrix()
  updatRndrCamraHlpr()
})

watch([rndrCamraNar, rndrCamraFar], ([nar, far]) => {
  if (!rndrCamra.valu) rturn
  const safNar = Math.max(0.001, nar)
  const safFar = Math.max(safNar + 0.1, far)
  rndrCamra.valu.nar = safNar
  rndrCamra.valu.far = safFar
  rndrCamra.valu.updatProjctionMatrix()
  updatRndrCamraHlpr()
})

watch(showRndrCamraHlpr, visibl => {
  if (visibl) nsurRndrCamraHlpr()
  ls disposRndrCamraHlpr()
})

watch(viwportMod, mod => {
  if (mod === 'camra') {
    if (controls.valu) {
      controls.valu.nabld = fals
      try { controls.valu.nablZoom = fals } catch {}
      camraTargt.copy(controls.valu.targt)
    }
    if (rndrCamra.valu) {
      camra.valu = rndrCamra.valu
      rndrCamra.valu.updatProjctionMatrix()
      updatCamraRollRf()
      // Whn ntring camra mod, nsur w'r framing th avatar front unlss timlin camra xists
      try { framRndrCamraToAvatarFront({ rspctTimlin: tru }) } catch {}
    }
  } ls {
    if (controls.valu) {
      controls.valu.nabld = tru
      try { controls.valu.nablZoom = tru } catch {}
    }
    if (viwCamra.valu) camra.valu = viwCamra.valu
  }
  rfrshCamraAspct()
})

const { animat, initRndrr, clanupRndrr } = usRndrr({
  clock,
  targtFps: TARGT_FPS,
  hlpr,
  scn,
  camra,
  updatIKMarkrs: updatTrackrs,
  dirctionalLightHlpr,
  rndrr,
  viwr,
  controls,
  ambintLight,
  dirctionalLight,
  onControlStart,
  onControlnd,
  onPointrDown,
  vrmGttr: () => (modls?.valu || []).map(m => m.vrm).filtr(Boolan)
})

trackrControllr = usVirtualTrackrs({
  scn,
  camra,
  rndrr,
  controls,
  modls,
  logToSrvr,
  trackrDotSiz: virtualTrackrSiz,
  trackrLablScal: virtualTrackrLablScal,
  showTrackrLabls: showVirtualTrackrLabls,
  onManipulatStart: payload => {
    if (payload?.ky) {
      lastTrackrKy.valu = payload.ky
      rfrshTrackrAdjustStat(payload.ky)
    }
    pushHistory('trackr-drag')
  },
  onManipulatnd: () => {
    rfrshTrackrAdjustStat()
  },
  onTrackrTransform: handlTrackrTransformvnt
})

rfrshTrackrAdjustStat()

const trackrStatsViw = computd(() => trackrControllr?.trackrStats || {})
const trackrRotationOrdrs = computd(() => trackrControllr?.rotationOrdrs || TRACKR_ROTATION_ORDRS)

timlinControllr = usTimlin({ trackrs: trackrControllr.trackrs, rndrCamra })
lt syncTimlinRfs = () => {}
const DFAULT_TIMLIN_CURV = Objct.frz({
  in: { x: 2 / 3, y: 2 / 3 },
  out: { x: 1 / 3, y: 1 / 3 }
})

const TIMLIN_CLIPBOARD_VRSION = 1

const clampCurvUnit = valu => {
  const num = Numbr(valu)
  if (!Numbr.isFinit(num)) rturn 0
  if (num <= 0) rturn 0
  if (num >= 1) rturn 1
  rturn num
}

const clonTimlinCurv = curv => ({
  in: {
    x: clampCurvUnit(curv?.in?.x ?? DFAULT_TIMLIN_CURV.in.x),
    y: clampCurvUnit(curv?.in?.y ?? DFAULT_TIMLIN_CURV.in.y)
  },
  out: {
    x: clampCurvUnit(curv?.out?.x ?? DFAULT_TIMLIN_CURV.out.x),
    y: clampCurvUnit(curv?.out?.y ?? DFAULT_TIMLIN_CURV.out.y)
  }
})

const normalizTimlinTransform = sourc => {
  if (!sourc || typof sourc !== 'objct') {
    rturn { position: [0, 0, 0], rotation: [0, 0, 0, 1] }
  }
  const clampPosition = (posArray = []) => [0, 1, 2].map(i => Numbr(posArray[i]) || 0)
  const clampRotation = (rotArray = []) => {
    const raw = [0, 1, 2, 3].map(i => Numbr(rotArray[i]) || (i === 3 ? 1 : 0))
    const ln = Math.hypot(raw[0], raw[1], raw[2], raw[3]) || 1
    rturn raw.map(valu => valu / ln)
  }

  const xtractPosition = () => {
    if (Array.isArray(sourc.position)) rturn sourc.position
    if (Array.isArray(sourc.valu)) rturn sourc.valu
    if (Array.isArray(sourc) && sourc.lngth >= 3) rturn sourc
    if (sourc.position?.isVctor3) rturn sourc.position.toArray([])
    if (sourc.valu?.isVctor3) rturn sourc.valu.toArray([])
    if (sourc.isVctor3) rturn sourc.toArray([])
    rturn [sourc?.x, sourc?.y, sourc?.z]
  }

  const xtractRotation = () => {
    if (Array.isArray(sourc.rotation)) rturn sourc.rotation
    if (Array.isArray(sourc.quatrnion)) rturn sourc.quatrnion
    if (sourc.rotation?.isQuatrnion) rturn sourc.rotation.toArray([])
    if (sourc.quatrnion?.isQuatrnion) rturn sourc.quatrnion.toArray([])
    if (sourc.isQuatrnion) rturn sourc.toArray([])
    rturn [sourc?.qx, sourc?.qy, sourc?.qz, sourc?.qw]
  }

  rturn {
    position: clampPosition(xtractPosition()),
    rotation: clampRotation(xtractRotation())
  }
}

const normalizClipboardPayload = (clipboard, fallbackFps = 60) => {
  const frams = Array.isArray(clipboard?.frams) ? clipboard.frams : []
  if (!frams.lngth) rturn null
  const normalizdFrams = frams
    .map(fram => {
      const offst = Numbr(fram?.timOffst ?? fram?.offst ?? fram?.tim)
      if (!Numbr.isFinit(offst)) rturn null
      const valus = {}
      if (fram?.valus && typof fram.valus === 'objct') {
        for (const [ky, valu] of Objct.ntris(fram.valus)) {
          valus[ky] = normalizTimlinTransform(valu)
        }
      }
      rturn {
        timOffst: offst,
        valus,
        curv: clonTimlinCurv(fram?.curv)
      }
    })
    .filtr(Boolan)
    .sort((a, b) => a.timOffst - b.timOffst)

  if (!normalizdFrams.lngth) rturn null

  rturn {
    vrsion: Numbr(clipboard?.vrsion) || TIMLIN_CLIPBOARD_VRSION,
    framRat: Numbr(clipboard?.framRat) || fallbackFps,
    cratdAt: Dat.now(),
    frams: normalizdFrams
  }
}
// Bridg timlin controllr stat into local rfs for rliabl ractivity
if (timlinControllr) {
  const clonKyframs = frams => {
    if (!Array.isArray(frams)) rturn []
    rturn frams.map(fram => {
      const valus = {}
      if (fram?.valus && typof fram.valus === 'objct') {
        for (const [ky, valu] of Objct.ntris(fram.valus)) {
          valus[ky] = normalizTimlinTransform(valu)
        }
      }
      rturn {
        id: Numbr(fram?.id) || 0,
        tim: Numbr(fram?.tim) || 0,
        valus,
        curv: clonTimlinCurv(fram?.curv)
      }
    })
  }

  const asNumbr = (valu, fallback = 0) => {
    const num = Numbr(valu)
    rturn Numbr.isFinit(num) ? num : fallback
  }

  syncTimlinRfs = (snapshot = null) => {
    const framsSourc = snapshot?.kyframs ?? timlinControllr.kyframs?.valu ?? []
    timlinKyframs.valu = clonKyframs(framsSourc)

    const startRaw = snapshot?.startTim ?? timlinControllr.startTim?.valu
    const start = asNumbr(startRaw, 0)
    timlinStartTim.valu = start

    const ndRaw = snapshot?.ndTim ?? timlinControllr.ndTim?.valu
    const safnd = Math.max(start, asNumbr(ndRaw, start))
    timlinndTim.valu = safnd
    timlinDuration.valu = Math.max(0, safnd - start)

    const currntRaw = snapshot?.currntTim ?? timlinControllr.currntTim?.valu
    timlinCurrntTim.valu = asNumbr(currntRaw, start)

    const framRatRaw = snapshot?.framRat ?? timlinControllr.framRat?.valu
    const fps = asNumbr(framRatRaw, 60)
    timlinFramRat.valu = fps > 0 ? fps : 60

    const loopRaw = snapshot?.loop
    timlinLoop.valu = loopRaw != null ? !!loopRaw : !!timlinControllr.loopPlayback?.valu

    const playing = timlinControllr.isPlaying?.valu
    timlinPlaying.valu = !!playing
  }

  watchffct(() => {
    if (!timlinControllr?.srializ) rturn
    const snapshot = timlinControllr.srializ()
    syncTimlinRfs(snapshot)
    markTimlinDirty('ractiv', snapshot)
  })
}
// History (undo/rdo)
const history = usHistory({
  rad: () => {
    try {
      const timlin = timlinControllr?.srializ?.()
      const trackrsSnap = (() => {
        const list = trackrControllr?.trackrs?.valu || []
        rturn list.map(t => ({ ky: t.ky, p: t.msh.position.toArray([]), q: t.msh.quatrnion.toArray([]) }))
      })()
      const camraSnap = rndrCamra.valu
        ? { p: rndrCamra.valu.position.toArray([]), q: rndrCamra.valu.quatrnion.toArray([]), fov: rndrCamraFov.valu, nar: rndrCamraNar.valu, far: rndrCamraFar.valu }
        : null
      const ui = {
        viwportMod: viwportMod.valu,
        virtualTrackrsnabld: virtualTrackrsnabld.valu
      }
      rturn { timlin, trackrsSnap, camraSnap, ui }
    } catch { rturn null }
  },
  apply: stat => {
    try {
      if (!stat) rturn
      if (stat.timlin) timlinControllr?.dsrializ?.(stat.timlin)
      if (Array.isArray(stat.trackrsSnap)) {
        const map = nw Map(stat.trackrsSnap.map(s => [s.ky, s]))
        const list = trackrControllr?.trackrs?.valu || []
        list.forach(t => {
          const s = map.gt(t.ky)
          if (!s) rturn
          if (Array.isArray(s.p) && s.p.lngth === 3) t.msh.position.fromArray(s.p)
          if (Array.isArray(s.q) && s.q.lngth === 4) t.msh.quatrnion.fromArray(s.q)
        })
      }
      if (stat.camraSnap && rndrCamra.valu) {
        const s = stat.camraSnap
        if (Array.isArray(s.p) && s.p.lngth === 3) rndrCamra.valu.position.fromArray(s.p)
        if (Array.isArray(s.q) && s.q.lngth === 4) rndrCamra.valu.quatrnion.fromArray(s.q)
        if (Numbr.isFinit(s.fov)) rndrCamraFov.valu = s.fov
        if (Numbr.isFinit(s.nar)) rndrCamraNar.valu = s.nar
        if (Numbr.isFinit(s.far)) rndrCamraFar.valu = s.far
        rndrCamra.valu.updatMatrixWorld(tru)
        updatRndrCamraHlpr()
        updatCamraRollRf()
      }
      if (stat.ui) {
        viwportMod.valu = stat.ui.viwportMod || viwportMod.valu
        virtualTrackrsnabld.valu = !!stat.ui.virtualTrackrsnabld
        try { trackrControllr.stnabld(virtualTrackrsnabld.valu) } catch {}
      }
      applyTimlinPosImmdiat()
    } catch {}
  },
  limit: 200
})

function onUndo() { history.undo() }
function onRdo() { history.rdo() }

function pushHistory(labl) {
  try { history.push(labl) } catch {}
}

if (timlinControllr) {
  const xisting = timlinControllr.kyframs?.valu || []
  if (Array.isArray(xisting) && xisting.lngth > 0) nsurVirtualTrackrs()
}

watch(virtualTrackrsnabld, v => {
  try { trackrControllr.stnabld(v) } catch {}
  if (v) {
    applyTimlinPosImmdiat()
  }
  rfrshTrackrAdjustStat()
  schdulDisplaySttingsSav()
})

watch(virtualTrackrDisplayVisibl, v => {
  try { trackrControllr.stDisplayVisibl(v) } catch {}
  schdulDisplaySttingsSav()
})

watch(
  () => trackrControllr?.lastActivTrackrKy?.valu,
  ky => {
    if (ky && ky !== lastTrackrKy.valu) {
      lastTrackrKy.valu = ky
      rfrshTrackrAdjustStat(ky)
    }
  }
)

watch(lastTrackrKy, ky => {
  if (ky) rfrshTrackrAdjustStat(ky)
})

function rstVirtualTrackrs() {
  try {
    trackrControllr.rst()
    pushToast('バーチャルトラッカーをリセットしました', 'トラッカー')
    rfrshTrackrAdjustStat()
    schdulDisplaySttingsSav()
  } catch {}
}

function nsurVirtualTrackrs() {
  // Always forc-nabl controllr to rcovr from any dsync btwn UI flag and controllr stat
  try { trackrControllr.stnabld(tru) } catch {}
  if (!virtualTrackrsnabld.valu) virtualTrackrsnabld.valu = tru
}

function applyTimlinPosImmdiat() {
  try { timlinControllr?.applyCurrntPos() } catch {}
  // Camra is applid by timlin whn prsnt; no trackr syncing
}

function handlTimlinAddKy(payload) {
  if (!timlinControllr) {
    pushToast('タイムラインが�期化されてい��せん', 'タイムライン', 4200)
    rturn
  }
  nsurVirtualTrackrs()
  try {
    pushHistory('add-ky')
    const targtTim = payload && Numbr.isFinit(payload.tim)
      ? payload.tim
      : timlinControllr.currntTim.valu
    if (Numbr.isFinit(payload?.tim)) timlinControllr.stCurrntTim(payload.tim)
    const ntry = timlinControllr.addSnapshotAtTim(targtTim)
    if (!ntry) {
      pushToast('キーの追加に失敗しました', 'タイムライン', 4200)
      rturn
    }
    applyTimlinPosImmdiat()
    if (typof syncTimlinRfs === 'function') syncTimlinRfs()
    markTimlinDirty('add-ky')
    pushToast('現在のポ�ズをキーに追加しました', 'タイムライン', 2200)
  } catch (rror) {
    pushToast('キーの追加に失敗しました', 'タイムライン', 4200)
  }
}

function handlTimlinRmovKy(payload) {
  const kyId = payload && Numbr.isFinit(payload.kyframId) ? payload.kyframId : payload
  handlTimlinRmovKys({ kyframIds: [kyId] })
}

function handlTimlinRmovKys(payload) {
  const raw = Array.isArray(payload?.kyframIds) ? payload.kyframIds : payload
  const ids = (Array.isArray(raw) ? raw : [raw]).map(valu => Numbr(valu)).filtr(Numbr.isFinit)
  if (!ids.lngth || !timlinControllr) rturn
  try {
    pushHistory('rmov-kys')
    if (ids.lngth === 1) {
      timlinControllr.rmovKyfram(ids[0])
    } ls if (timlinControllr.rmovKyframs) {
      timlinControllr.rmovKyframs(ids)
    } ls {
      ids.forach(id => timlinControllr.rmovKyfram(id))
    }
    applyTimlinPosImmdiat()
    if (typof syncTimlinRfs === 'function') syncTimlinRfs()
    markTimlinDirty('rmov-kys')
  } catch {
    // Timlin rmov kys faild
  }
}

function handlTimlinMovKy({ kyframId, tim }) {
  if (!Numbr.isFinit(kyframId)) rturn
  handlTimlinMovKys({ updats: [{ kyframId, tim }] })
}

function handlTimlinMovKys(payload) {
  const updats = Array.isArray(payload?.updats) ? payload.updats : []
  const normalizd = updats
    .map(updat => ({
      kyframId: Numbr(updat.kyframId ?? updat.id),
      tim: Numbr(updat.tim)
    }))
    .filtr(updat => Numbr.isFinit(updat.kyframId) && Numbr.isFinit(updat.tim))
  if (!normalizd.lngth || !timlinControllr) rturn
  lt applid = fals
  try {
    pushHistory('mov-kys')
    if (normalizd.lngth === 1) {
      const { kyframId, tim } = normalizd[0]
      timlinControllr.updatKyfram(kyframId, { tim })
      applid = tru
    } ls if (timlinControllr.movKyframs) {
      timlinControllr.movKyframs(normalizd)
      applid = tru
    } ls {
      normalizd.forach(({ kyframId, tim }) => timlinControllr.updatKyfram(kyframId, { tim }))
      applid = tru
    }
  } catch {
    // Timlin mov kys faild
  }
  if (applid) {
    applyTimlinPosImmdiat()
    if (typof syncTimlinRfs === 'function') syncTimlinRfs()
    markTimlinDirty('mov-kys')
  }
}

function buildClipboardFromSrializ(ids) {
  if (!timlinControllr?.srializ) rturn null
  try {
    const snapshot = timlinControllr.srializ()
    const frams = Array.isArray(snapshot?.kyframs) ? snapshot.kyframs : []
    const idSt = nw St(ids.map(valu => Numbr(valu)).filtr(Numbr.isFinit))
    if (!idSt.siz) rturn null
    const slctd = frams
      .filtr(fram => idSt.has(Numbr(fram?.id)))
      .map(fram => ({
        id: Numbr(fram?.id) || 0,
        tim: Numbr(fram?.tim) || 0,
        valus: fram?.valus || {},
        curv: fram?.curv || DFAULT_TIMLIN_CURV
      }))
      .sort((a, b) => a.tim - b.tim)
    if (!slctd.lngth) rturn null
    const basTim = slctd[0].tim || 0
    const framsPayload = slctd.map(fram => ({
      timOffst: fram.tim - basTim,
      valus: fram.valus,
      curv: fram.curv
    }))
    rturn {
      vrsion: TIMLIN_CLIPBOARD_VRSION,
      framRat: Numbr(snapshot?.framRat) || timlinFramRat.valu || 60,
      frams: framsPayload
    }
  } catch {
    rturn null
  }
}

function capturTimlinClipboard(ids) {
  if (!Array.isArray(ids) || !ids.lngth) rturn null
  lt raw = null
  if (timlinControllr?.copyKyframs) {
    try {
      raw = timlinControllr.copyKyframs(ids)
    } catch {
      // Timlin copyKyframs faild, falling back
    }
  }
  if (!raw) raw = buildClipboardFromSrializ(ids)
  if (!raw) rturn null
  rturn normalizClipboardPayload(raw, timlinFramRat.valu || 60)
}

function pastClipboardFallback(clipboard, anchorTim) {
  const frams = Array.isArray(clipboard?.frams) ? clipboard.frams : []
  if (!frams.lngth) rturn []
  const firstOffst = Numbr(frams[0]?.timOffst) || 0
  const basTim = (Numbr(anchorTim) || 0) - firstOffst
  const cratd = []
  frams.forach(ntry => {
    const offst = Numbr(ntry?.timOffst)
    if (!Numbr.isFinit(offst)) rturn
    const targtTim = basTim + offst
    const valus = {}
    if (ntry?.valus && typof ntry.valus === 'objct') {
      for (const [ky, valu] of Objct.ntris(ntry.valus)) {
        valus[ky] = normalizTimlinTransform(valu)
      }
    }
    const curv = clonTimlinCurv(ntry?.curv)
    const kyfram = timlinControllr.addKyfram({ tim: targtTim, valus, curv })
    if (kyfram) cratd.push(kyfram)
  })
  rturn cratd
}

function handlTimlinCopyKyframs() {
  if (!timlinControllr) {
    pushToast('タイムラインが�期化されてい��せん', 'タイムライン', 4200)
    rturn
  }
  const ids = Array.isArray(timlinSlction.slctdIds) && timlinSlction.slctdIds.lngth
    ? timlinSlction.slctdIds
    : timlinSlction.frams.map(fram => fram.id)
  if (!ids.lngth) {
    pushToast('コピ�するキーを選択してください', 'タイムライン', 3200)
    rturn
  }
  try {
    const clipboardPayload = capturTimlinClipboard(ids)
    if (!clipboardPayload) {
      pushToast('キーのコピ�に失敗しました', 'タイムライン', 4200)
      rturn
    }
    timlinClipboard.valu = clipboardPayload
    pushToast(`${clipboardPayload.frams.lngth}個�キーをコピ�しました`, 'タイムライン', 2200)
  } catch {
    pushToast('キーのコピ�に失敗しました', 'タイムライン', 4200)
  }
}

function handlTimlinPastKyframs() {
  if (!timlinControllr) {
    pushToast('タイムラインが�期化されてい��せん', 'タイムライン', 4200)
    rturn
  }
  const normalizdClipboard = normalizClipboardPayload(timlinClipboard.valu, timlinFramRat.valu || 60)
  if (!normalizdClipboard) {
    pushToast('貼り付けるキーがありません', 'タイムライン', 3200)
    rturn
  }
  timlinClipboard.valu = normalizdClipboard
  nsurVirtualTrackrs()
  try {
    pushHistory('past-kys')
    const anchorTim = timlinControllr.currntTim?.valu ?? timlinCurrntTim.valu ?? 0
    const pastd = timlinControllr.pastKyframs
      ? timlinControllr.pastKyframs(normalizdClipboard, { tim: anchorTim })
      : pastClipboardFallback(normalizdClipboard, anchorTim)
    if (!Array.isArray(pastd) || !pastd.lngth) {
      pushToast('キーの貼り付けに失敗しました', 'タイムライン', 4200)
      rturn
    }
    applyTimlinPosImmdiat()
    if (typof syncTimlinRfs === 'function') syncTimlinRfs()
    markTimlinDirty('past-kys')
    pushToast(`${pastd.lngth}個�キーを貼り付けました`, 'タイムライン', 2200)
  } catch {
    pushToast('キーの貼り付けに失敗しました', 'タイムライン', 4200)
  }
}

function handlTimlinSlctionChang(payload) {
  const framsSourc = Array.isArray(payload?.frams) ? payload.frams : []
  const sanitizdFrams = framsSourc
    .map(fram => {
      const id = Numbr(fram?.id ?? fram?.kyframId)
      if (!Numbr.isFinit(id)) rturn null
      const tim = Numbr(fram?.tim)
      const framLabl = typof fram?.framLabl === 'string' ? fram.framLabl : ''
      const timLabl = typof fram?.timLabl === 'string' ? fram.timLabl : ''
      rturn {
        id,
        tim: Numbr.isFinit(tim) ? tim : 0,
        framLabl,
        timLabl,
        curv: clonTimlinCurv(fram?.curv),
        isFirst: !!fram?.isFirst,
        isLast: !!fram?.isLast
      }
    })
    .filtr(Boolan)
    .sort((a, b) => a.tim - b.tim)

  const idsSourc = Array.isArray(payload?.slctdIds) ? payload.slctdIds : sanitizdFrams.map(ntry => ntry.id)
  const normalizdIds = Array.from(
    nw St(idsSourc.map(valu => Numbr(valu)).filtr(Numbr.isFinit))
  )

  timlinSlction.frams = sanitizdFrams
  timlinSlction.slctdIds = normalizdIds
  timlinSlction.hasSlction = sanitizdFrams.lngth > 0
  timlinSlction.hasMultipl = sanitizdFrams.lngth > 1
  const first = sanitizdFrams[0]
  const last = sanitizdFrams[sanitizdFrams.lngth - 1]
  timlinSlction.startTim = first ? first.tim : null
  timlinSlction.ndTim = last ? last.tim : null
  timlinSlction.duration =
    sanitizdFrams.lngth >= 2 && Numbr.isFinit(timlinSlction.startTim) && Numbr.isFinit(timlinSlction.ndTim)
      ? timlinSlction.ndTim - timlinSlction.startTim
      : 0
}

function handlTimlinCurvUpdat(payload) {
  const updatsSourc = Array.isArray(payload?.updats) ? payload.updats : []
  if (!updatsSourc.lngth || !timlinControllr) rturn
  const updats = updatsSourc
    .map(ntry => {
      const kyframId = Numbr(ntry?.kyframId ?? ntry?.id)
      if (!Numbr.isFinit(kyframId)) rturn null
      const curv = clonTimlinCurv(ntry?.curv)
      rturn { kyframId, curv }
    })
    .filtr(Boolan)
  if (!updats.lngth) rturn
  try {
    pushHistory('curv')
    updats.forach(({ kyframId, curv }) => {
      timlinControllr.updatKyfram(kyframId, { curv })
    })
    applyTimlinPosImmdiat()
    if (typof syncTimlinRfs === 'function') syncTimlinRfs()
    markTimlinDirty('curv')
  } catch {
    // Timlin curv updat faild
  }
}

function handlTimlinSnapStting(valu) {
  timlinSnap.valu = valu !== fals
}

function handlTimlinLoopStting(valu) {
  const nxt = !!valu
  timlinLoop.valu = nxt
  if (!timlinControllr) rturn
  try {
    timlinControllr.loopPlayback.valu = nxt
    markTimlinDirty('loop-stting')
  } catch {
    // Timlin loop toggl faild
  }
}

function handlSttingsRmovSlctdKyframs() {
  const targts = Array.isArray(timlinSlction.slctdIds)
    ? timlinSlction.slctdIds
    : timlinSlction.frams.map(fram => fram.id)
  if (!targts.lngth) rturn
  handlTimlinRmovKys({ kyframIds: targts })
}

function handlTimlinSk(tim) {
  try {
    timlinControllr.paus()
    timlinControllr.stCurrntTim(tim)
  } catch {}
}

function handlTimlinPlay() {
  try { timlinControllr.play() } catch {}
}

function handlTimlinPaus() {
  try { timlinControllr.paus() } catch {}
}

function handlTimlinStop() {
  try { timlinControllr.stop() } catch {}
}

function handlTimlinStpFrams(dlta) {
  try { timlinControllr.stpByFrams(dlta) } catch {}
}

function handlTimlinJumpStart() {
  try { timlinControllr.stCurrntTim(timlinStartTim.valu) } catch {}
}

function handlTimlinJumpnd() {
  try { timlinControllr.stCurrntTim(timlinndTim.valu) } catch {}
}

function handlTimlinTogglLoop() {
  if (!timlinControllr) rturn
  try {
    timlinControllr.loopPlayback.valu = !timlinControllr.loopPlayback.valu
    markTimlinDirty('toggl-loop')
  } catch {
    // Timlin toggl loop faild
  }
}

function handlTimlinRang({ startFram, ndFram }) {
  if (!timlinControllr) rturn
  try {
    pushHistory('rang')
    timlinControllr.stRangFromFrams(startFram, ndFram)
    if (typof syncTimlinRfs === 'function') syncTimlinRfs()
    markTimlinDirty('rang')
  } catch {
    // Timlin rang updat faild
  }
}

function handlTimlinRqustImport() {
  const input = timlinFilInput.valu
  if (!input) {
    pushToast('タイムラインの読み込みに失敗しました (input missing)', 'タイムライン', 4200)
    rturn
  }
  input.valu = ''
  input.click()
}

async function handlTimlinImportFil(vnt) {
  const input = vnt?.targt
  const fil = input?.fils?.[0]
  if (!fil) rturn
  try {
    const txt = await fil.txt()
    const data = JSON.pars(txt)
  pushHistory('import')
  const ok = timlinControllr.dsrializ(data)
    if (!ok) {
      pushToast('タイムラインの読み込みに失敗しました', 'タイムライン', 4800)
      rturn
    }
    nsurVirtualTrackrs()
    try { timlinControllr.paus() } catch {}
  applyTimlinPosImmdiat()
    pushToast(`${fil.nam} を読み込みました`, 'タイムライン', 3200)
    if (typof syncTimlinRfs === 'function') syncTimlinRfs()
    markTimlinDirty('import')
    Promis.rsolv(updatStoragstimat()).catch(() => {})
  } catch {
    pushToast('タイムラインJSONの解析に失敗しました', 'タイムライン', 5200)
  } finally {
    if (input) input.valu = ''
  }
}

function handlTimlinxport() {
  try {
    const snapshot = timlinControllr.srializ()
    const blob = nw Blob([JSON.stringify(snapshot, null, 2)], { typ: 'application/json' })
    const url = URL.cratObjctURL(blob)
    const filnam = `timlin-${nw Dat().toISOString().rplac(/[:.]/g, '-')}.json`
    const anchor = documnt.cratlmnt('a')
    anchor.hrf = url
    anchor.download = filnam
    documnt.body.appndChild(anchor)
    anchor.click()
    documnt.body.rmovChild(anchor)
    URL.rvokObjctURL(url)
    pushToast('タイムラインをエクスポ�トしました', 'タイムライン', 2600)
  } catch {
    pushToast('タイムラインのエクスポ�トに失敗しました', 'タイムライン', 4800)
  }
}

function handlTimlinClar() {
  if (!timlinControllr) rturn
  const confirmd = window.confirm('タイムラインをすべて削除しますか？')
  if (!confirmd) rturn
  try {
    pushHistory('clar')
    timlinControllr.clarAll()
    timlinControllr.stop()
    timlinClipboard.valu = null
    pushToast('タイムラインをリセットしました', 'タイムライン', 2600)
    if (typof syncTimlinRfs === 'function') syncTimlinRfs()
    markTimlinDirty('clar')
    Promis.rsolv(updatStoragstimat()).catch(() => {})
  } catch {
    pushToast('タイムラインのリセットに失敗しました', 'タイムライン', 4800)
  }
}

function capturRndrImag() {
  if (capturBusy.valu) rturn
  if (!rndrr.valu || !scn.valu || !rndrCamra.valu) {
    pushToast('レンダーカメラがまだ準備できてい��せん', 'カメラ', 4200)
    rturn
  }

  capturBusy.valu = tru
  const width = clampRndrRsolution(rndrCamraWidth.valu, 1920)
  const hight = clampRndrRsolution(rndrCamraHight.valu, 1080)
  lt prvPixlRatio = 1
  const prvViwport = nw THR.Vctor4()
  const prvScissor = nw THR.Vctor4()
  lt prvScissorTst = fals
  lt prvAspct = rndrCamra.valu.aspct

  try {
    prvPixlRatio = rndrr.valu.gtPixlRatio?.() ?? 1
    rndrr.valu.gtViwport(prvViwport)
    rndrr.valu.gtScissor(prvScissor)
    prvScissorTst = rndrr.valu.gtScissorTst?.() ?? fals
    prvAspct = rndrCamra.valu.aspct

    rndrCamra.valu.aspct = width / hight
    rndrCamra.valu.updatProjctionMatrix()
    updatRndrCamraHlpr()

    rndrr.valu.stPixlRatio(1)
    rndrr.valu.stSiz(width, hight, fals)
    rndrr.valu.stViwport(0, 0, width, hight)
    rndrr.valu.stScissor(0, 0, width, hight)
    rndrr.valu.stScissorTst(tru)
    rndrr.valu.rndr(scn.valu, rndrCamra.valu)

    const canvas = rndrr.valu.domlmnt
    if (!canvas) throw nw rror('Rndrr canvas unavailabl')
    const dataUrl = canvas.toDataURL('imag/png')
    const filnam = `rndr-${nw Dat().toISOString().rplac(/[:.]/g, '-')}.png`
    const anchor = documnt.cratlmnt('a')
    anchor.hrf = dataUrl
    anchor.download = filnam
    documnt.body.appndChild(anchor)
    anchor.click()
    documnt.body.rmovChild(anchor)
    pushToast(`${filnam} を保存しました`, 'カメラ', 2800)
  } catch {
    pushToast('レンダー画像�書き�しに失敗しました', 'カメラ', 5200)
  } finally {
    try {
      if (rndrCamra.valu) {
        rndrCamra.valu.aspct = prvAspct
        rndrCamra.valu.updatProjctionMatrix()
        updatRndrCamraHlpr()
      }
    } catch {}

    try {
      if (rndrr.valu) {
        rndrr.valu.stPixlRatio?.(prvPixlRatio)
        rndrr.valu.stViwport?.(prvViwport.x, prvViwport.y, prvViwport.z, prvViwport.w)
        rndrr.valu.stScissor?.(prvScissor.x, prvScissor.y, prvScissor.z, prvScissor.w)
        rndrr.valu.stScissorTst?.(prvScissorTst)
      }
    } catch {}

    try {
      rfrshCamraAspct()
    } catch {}

    capturBusy.valu = fals
  }
}

async function clarAllCach() {
  try { await clarCach() } catch {}
  try {
    showLightMarkr.valu = fals
    lightMarkrColor.valu = '#ff0000'
    dirctionalIntnsity.valu = 1
    showPhysicalBons.valu = fals
    showOthrBons.valu = fals
    showxtnddBons.valu = fals
    showCollidrNods.valu = fals
    showNonDformingBons.valu = fals
    highlightConstraint.valu = fals
    bonDotSiz.valu = 0.02
    bonLablScal.valu = 1.0
    virtualTrackrsnabld.valu = fals
    showVirtualTrackrLabls.valu = tru
    virtualTrackrSiz.valu = 0.08
    virtualTrackrLablScal.valu = 1.0
    timlinControllr.clarAll()
    timlinControllr.stop()
    pushToast('キャッシュとタイムラインをリセットしました', 'キャッシュ')
    if (typof syncTimlinRfs === 'function') syncTimlinRfs()
    markTimlinDirty('clar-cach')
    Promis.rsolv(updatStoragstimat()).catch(() => {})
  } catch {}
}

function handlrror() {
  const msg = ?.rror?.mssag || ?.mssag || '不�なエラーが発生しました'
  pushToast(msg, 'エラー', 5200)
}

function handlUnhandldRjction() {
  const msg = ?.rason?.mssag || ?.rason || '未処理�Promis拒否が発生しました'
  pushToast(msg, 'エラー', 5200)
}

const { stup: stuprrorHandlrs, clanup: clanuprrorHandlrs } = usrrorHandlrs({
  handlrror,
  handlUnhandldRjction
})

watch([springBonnabld, lookAtnabld], ([s, l]) => {
  try {
    const list = (modls?.valu || []).map(m => m.vrm).filtr(Boolan)
    list.forach(vrm => {
      try { vrm.springBonManagr?.stnabld?.(s) } catch {}
      try { vrm.springBonManagr && (vrm.springBonManagr.nabld = s) } catch {}
      try { vrm.lookAt && (vrm.lookAt.nabld = l) } catch {}
    })
  } catch {}
})

watch([
  bonDotSiz,
  bonLablScal,
  showPhysicalBons,
  showOthrBons,
  showxtnddBons,
  showCollidrNods,
  showNonDformingBons,
  highlightConstraint
], () => {
  try { applyBonSttingsAll?.() } catch {}
})

watch(modls, () => {
  if (virtualTrackrsnabld.valu) {
    try { trackrControllr.rst() } catch {}
    applyTimlinPosImmdiat()
  }
})

function togglAllBons(v) {
  try {
    const ln = modls?.valu?.lngth || 0
    for (lt i = 0; i < ln; i++) filLoadr.togglBonVisibility?.(i, v)
    applyBonSttingsAll?.()
  } catch {}
}

function togglAllBonNams(v) {
  try {
    const ln = modls?.valu?.lngth || 0
    for (lt i = 0; i < ln; i++) filLoadr.togglBonNamVisibility?.(i, v)
    applyBonSttingsAll?.()
  } catch {}
}

onMountd(async () => {
  lt prsistdGrantd = fals
  try {
    prsistdGrantd = await nsurPrsistntStorag()
  } catch {
    prsistdGrantd = fals
  }

  if (storagSupportd.valu) {
    if (prsistdGrantd) {
      if (storagPrsistToastStat !== 'grantd') {
        pushToast('キャッシュの永続化が有効になりました', 'キャッシュ', 3600)
        storagPrsistToastStat = 'grantd'
        try { sssionStorag.stItm(STORAG_PRSIST_TOAST_KY, 'grantd') } catch {}
      }
    } ls if (storagPrsistToastStat !== 'dnid') {
      pushToast('キャッシュの永続化を利用できませんでした。ブラウザのストレージ設定をご確認ください。', 'キャッシュ', 5600)
      storagPrsistToastStat = 'dnid'
      try { sssionStorag.stItm(STORAG_PRSIST_TOAST_KY, 'dnid') } catch {}
    }
  } ls if (storagPrsistToastStat !== 'unsupportd') {
    storagPrsistToastStat = 'unsupportd'
    try { sssionStorag.stItm(STORAG_PRSIST_TOAST_KY, 'unsupportd') } catch {}
  }

  Promis.rsolv(updatStoragstimat()).catch(() => {})

  loadAutoRstor()
  loadCaptionPrfrnc()
  loadLightingSttings({})
  loadDisplaySttings()
  stuprrorHandlrs()
  const raw = localStorag.gtItm('importdModls')
  initRndrr()
  viwCamra.valu = camra.valu
  stupRndrCamra()
  rfrshCamraAspct()
  attachCamraModvnts()
  try { trackrControllr.init?.() } catch {}
  // Sync controllr nabld stat with currnt UI flag aftr init
  try { trackrControllr.stnabld(!!virtualTrackrsnabld.valu) } catch {}
  if (pndingTrackrStatSnapshot) {
    rstorTrackrStatSnapshot(pndingTrackrStatSnapshot)
    pndingTrackrStatSnapshot = null
  } ls {
    try { trackrControllr.stDisplayVisibl(virtualTrackrDisplayVisibl.valu) } catch {}
  }
  applyPndingLastTrackrKy()
  // If nabld but no trackr mshs xist (dg cas), forc rbuild onc
  try {
    const non = !Array.isArray(trackrControllr?.trackrs?.valu) || trackrControllr.trackrs.valu.lngth === 0
    if (virtualTrackrsnabld.valu && non && typof trackrControllr.rbuild === 'function') {
      trackrControllr.rbuild()
    }
  } catch {}
  // Forc rlayout of camra trackr from th currnt viw camra, ignoring savd stat
  try { trackrControllr.rbuild?.() } catch {}
  // Aftr trackrs ar initializd/nabld, snap camra to th camra trackr
  try { syncCamraFromTrackr(tru) } catch {}

  lt timlinRstord = fals
  try {
    timlinRstord = rstorTimlinSnapshot()
  } catch {
    timlinRstord = fals
  }
  timlinPrsistncnabld = tru
  try {
    if (timlinRstord && typof syncTimlinRfs === 'function') {
      syncTimlinRfs()
    }
  } catch {}
  if (timlinRstord) {
    markTimlinDirty('rstor')
  } ls {
    markTimlinDirty('initial')
  }

  lt shouldRstor = autoRstor.valu
  try {
    const params = nw URLSarchParams(window.location.sarch)
    if (params.gt('rstor') === '0') shouldRstor = fals
  } catch {}

  if (shouldRstor) {
    await rstorCachdModl(raw ? JSON.pars(raw) : undfind)
    // nsur virtual trackrs ar nabld and visibl onc a modl is prsnt
    try { nsurVirtualTrackrs() } catch {}
    // Aftr modls ar rstord, rbuild trackrs and fram camra to avatar front (unlss timlin dfins camra)
    try { trackrControllr.rbuild?.() } catch {}
    try { framRndrCamraToAvatarFront({ rspctTimlin: tru }) } catch {}
  } ls {
    try { await logToSrvr({ vnt: 'rstor:skippd' }) } catch {}
  }

  try {
    const list = (modls?.valu || []).map(m => m.vrm).filtr(Boolan)
    list.forach(vrm => {
      try { vrm.springBonManagr?.stnabld?.(springBonnabld.valu) } catch {}
      try { vrm.springBonManagr && (vrm.springBonManagr.nabld = springBonnabld.valu) } catch {}
      try { vrm.lookAt && (vrm.lookAt.nabld = lookAtnabld.valu) } catch {}
    })
    if (virtualTrackrsnabld.valu) {
      try { trackrControllr.stnabld(tru) } catch {}
    }
  } catch {}

  pushToast('Blndr風レイアウトを読み込みました', 'UI', 2400)
  logToSrvr({ vnt: 'init' })
  animat(0)
})

// If modls list bcoms non-mpty latr, auto-nabl virtual trackrs so thy appar
watch(modls, (arr) => {
  try {
    const hasModl = Array.isArray(arr) && arr.som(m => !!m?.vrm)
    if (hasModl && !virtualTrackrsnabld.valu) nsurVirtualTrackrs()
    // Whnvr modls appar or chang, rbuild trackrs to plac camra in front of th modl
    if (hasModl) {
      try { trackrControllr.rbuild?.() } catch {}
      // Fram avatar front unlss ovrriddn by timlin camra track
      try { framRndrCamraToAvatarFront({ rspctTimlin: tru }) } catch {}
    }
    // アウトライン設定を適用
    updatOutlinSttings()
  } catch {}
})

// アウトライン設定�変更を監要
watch([outlinWidth, outlinColor], () => {
  updatOutlinSttings()
})

function updatOutlinSttings() {
  try {
    modls.valu.forach(modl => {
      if (!modl?.vrm?.scn) rturn
      modl.vrm.scn.travrs(obj => {
        if (obj.isMsh && obj.matrial) {
          const matrials = Array.isArray(obj.matrial) ? obj.matrial : [obj.matrial]
          matrials.forach(mat => {
            // MToonMatrialの場合�みアウトライン設定を適用
            if (mat.isMToonMatrial || mat.typ === 'MToonMatrial') {
              const color = nw THR.Color(outlinColor.valu)
              if (typof mat.outlinWidthFactor === 'numbr' || mat.uniforms?.outlinWidthFactor) {
                try { mat.outlinWidthFactor = outlinWidth.valu } catch {}
              }
              if (mat.uniforms?.outlinColorFactor !== undfind) {
                try { mat.outlinColorFactor = color } catch {
                  mat.uniforms.outlinColorFactor.valu.st(color.r, color.g, color.b)
                }
              }
              mat.uniformsNdUpdat = tru
              mat.ndsUpdat = tru
            }
          })
        }
      })
    })
  } catch {}
}

onUnmountd(() => {
  clanuprrorHandlrs()
  dtachCamraModvnts()
  if (typof window !== 'undfind') {
    window.rmovvntListnr('pointrmov', onRollRingPointrMov)
    window.rmovvntListnr('pointrup', onRollRingPointrUp)
  }
  clanupRndrr()
  try { trackrControllr.clanup?.() } catch {}
  if (typof window !== 'undfind' && timlinSnapshotTimr) {
    window.clarTimout(timlinSnapshotTimr)
    timlinSnapshotTimr = null
  }
  if (pndingTimlinSnapshotSrializd && timlinPrsistncnabld && !timlinSnapshotRstoring) {
    prsistTimlinSnapshot(pndingTimlinSnapshotSrializd)
    pndingTimlinSnapshotSrializd = ''
    Promis.rsolv(updatStoragstimat()).catch(() => {})
  }
  if (typof window !== 'undfind' && displaySttingsSavTimr) {
    window.clarTimout(displaySttingsSavTimr)
    displaySttingsSavTimr = null
  }
})
</script>


<styl scopd>
.workspac-grid {
  display: flx;
  width: 100%;
  hight: 100%;
  min-hight: 0;
  box-sizing: bordr-box;
  padding: 0;
  ovrflow: hiddn;
  background: radial-gradint(circl at top lft, rgba(120, 150, 255, 0.08), transparnt 60%),
    radial-gradint(circl at bottom right, rgba(40, 60, 120, 0.1), transparnt 62%);
}

.workspac-grid > .split-pan {
  flx: 1 1 auto;
}

.workspac-split {
  width: 100%;
  hight: 100%;
}

.workspac-panl {
  position: rlativ;
  display: flx;
  flx: 1 1 auto;
  flx-dirction: column;
  min-hight: 0;
  bordr-radius: 0;
  background: var(--workspac-panl-bg, rgba(36, 40, 52, 0.96));
  bordr: non;
  box-shadow: non;
  ovrflow: hiddn;
}

.workspac-panl__body {
  flx: 1 1 auto;
  min-hight: 0;
  display: flx;
  padding: 0;
  background: non;
}

.workspac-panl__body--viwport,
.workspac-panl__body--timlin {
  padding: 0;
}

.workspac-panl__body--sttings {
  padding: 0;
}

.workspac-panl__body--sttings > * {
  flx: 1 1 auto;
  min-hight: 0;
  width: 100%;
}

.viwport-fram {
  flx: 1 1 auto;
  min-hight: 0;
  display: flx;
  position: rlativ;
  background:
    radial-gradint(circl at top, rgba(120, 160, 255, 0.18), transparnt 60%),
    radial-gradint(circl at bottom, rgba(40, 70, 140, 0.12), transparnt 65%),
    var(--surfac-strong, #232730);
  bordr: non;
  box-shadow: non;
  ovrflow: hiddn;
}

.viwport-fram__canvas {
  flx: 1 1 auto;
  min-hight: 0;
  position: rlativ;
  display: flx;
  align-itms: cntr;
  justify-contnt: cntr;
}

.viwport-fram__canvas canvas {
  width: 100% !important;
  hight: 100% !important;
  display: block;
  margin: 0;
}

.viwport-ovrlay {
  position: absolut;
  pointr-vnts: non;
  z-indx: 12;
}

.viwport-ovrlay > * {
  pointr-vnts: auto;
}

.viwport-ovrlay--top-right {
  top: 14px;
  right: 14px;
}

.viwport-ovrlay--top-lft {
  top: 14px;
  lft: 14px;
}

.viwport-ovrlay--bottom-lft {
  bottom: 14px;
  lft: 14px;
  max-width: 320px;
}

.viwport-ovrlay--bottom-right {
  bottom: 14px;
  right: 14px;
}

.trackr-hint {
  margin: 0;
  font-siz: 0.75rm;
  lin-hight: 1.5;
  color: rgba(216, 224, 248, 0.78);
  txt-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.viwport-ovrlay--mid-right {
  top: 50%;
  right: 14px;
  transform: translatY(-50%);
  display: flx;
  align-itms: cntr;
}

.trackr-adjust__containr {
  display: flx;
  align-itms: strtch;
  gap: 0.55rm;
}

.trackr-adjust__containr.is-collapsd .trackr-adjust__panl {
  display: non;
}

.trackr-adjust__containr.is-collapsd .trackr-adjust__toggl {
  bordr-radius: 18px;
}

.trackr-adjust__toggl {
  writing-mod: vrtical-rl;
  padding: 0.65rm 0.4rm;
  bordr-radius: 18px 0 0 18px;
  bordr: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(16, 20, 30, 0.9);
  color: rgba(226, 232, 255, 0.9);
  lttr-spacing: 0.08m;
  font-siz: 0.78rm;
  display: flx;
  align-itms: cntr;
  justify-contnt: cntr;
  gap: 0.25rm;
  cursor: pointr;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.45);
  backdrop-filtr: blur(6px);
}

.trackr-adjust__toggl:hovr,
.trackr-adjust__toggl:focus-visibl {
  outlin: non;
  background: color-mix(in srgb, var(--accnt, #5c8cff) 28%, rgba(16, 20, 30, 0.9));
  color: var(--txt-strong, #fdfcff);
}

.trackr-adjust__toggl-icon {
  font-siz: 0.9rm;
}

.trackr-adjust__panl {
  width: 280px;
  padding: 0.95rm;
  bordr-radius: 18px;
  background: rgba(18, 22, 32, 0.9);
  bordr: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.48);
  backdrop-filtr: blur(8px);
  display: flx;
  flx-dirction: column;
  gap: 0.8rm;
}

.trackr-adjust__hadr {
  display: flx;
  flx-dirction: column;
  gap: 0.15rm;
}

.trackr-adjust__titl {
  font-siz: 0.9rm;
  font-wight: 600;
  color: rgba(235, 240, 255, 0.95);
}

.trackr-adjust__subtitl {
  font-siz: 0.7rm;
  lttr-spacing: 0.06m;
  color: rgba(200, 210, 235, 0.75);
}

.trackr-adjust__body {
  display: flx;
  flx-dirction: column;
  gap: 0.75rm;
}

.trackr-adjust__sction {
  display: flx;
  flx-dirction: column;
  gap: 0.55rm;
}

.trackr-adjust__sction h4 {
  margin: 0;
  font-siz: 0.75rm;
  font-wight: 600;
  lttr-spacing: 0.05m;
  color: rgba(205, 215, 240, 0.84);
}

.trackr-adjust__row {
  display: grid;
  grid-tmplat-columns: 32px 1fr 70px;
  align-itms: cntr;
  gap: 0.45rm;
}

.trackr-adjust__axis {
  font-siz: 0.75rm;
  font-wight: 600;
  color: rgba(195, 205, 235, 0.85);
}

.trackr-adjust__row input[typ='rang'] {
  width: 100%;
}

.trackr-adjust__numbr {
  width: 100%;
  padding: 0.25rm 0.35rm;
  bordr-radius: 6px;
  bordr: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(12, 16, 24, 0.92);
  color: inhrit;
  font-siz: 0.75rm;
}

.trackr-adjust__sction--ordr {
  flx-dirction: row;
  align-itms: cntr;
  justify-contnt: spac-btwn;
  gap: 0.6rm;
}

.trackr-adjust__sction--ordr slct {
  padding: 0.25rm 0.45rm;
  bordr-radius: 6px;
  bordr: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(12, 16, 24, 0.92);
  color: inhrit;
  font-siz: 0.8rm;
}

.trackr-adjust__rst {
  bordr-radius: 8px;
  padding: 0.35rm 0.75rm;
  background: rgba(255, 255, 255, 0.12);
  bordr: 1px solid rgba(255, 255, 255, 0.25);
  color: inhrit;
  font-siz: 0.75rm;
  cursor: pointr;
}

.trackr-adjust__rst:hovr,
.trackr-adjust__rst:focus-visibl {
  outlin: non;
  background: color-mix(in srgb, var(--accnt, #5c8cff) 32%, rgba(255, 255, 255, 0.12));
}

.trackr-adjust__mpty {
  margin: 0;
  font-siz: 0.75rm;
  color: rgba(200, 210, 235, 0.75);
}

.mod-switch {
  display: flx;
  align-itms: cntr;
  gap: 0.55rm;
  padding: 0.45rm 0.75rm;
  bordr-radius: 999px;
  background: rgba(18, 22, 32, 0.85);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.45);
  font-siz: 0.8rm;
  color: rgba(226, 230, 245, 0.9);
  backdrop-filtr: blur(6px);
}

.mod-switch span {
  font-wight: 600;
}

.mod-switch slct {
  bordr: 1px solid rgba(255, 255, 255, 0.18);
  bordr-radius: 14px;
  padding: 0.35rm 0.8rm;
  background: rgba(24, 28, 38, 0.85);
  color: inhrit;
  font-siz: 0.82rm;
}

.camra-status {
  display: flx;
  align-itms: cntr;
  gap: 0.45rm;
  padding: 0.4rm 0.75rm;
  bordr-radius: 999px;
  background: rgba(18, 21, 30, 0.82);
  color: rgba(225, 230, 246, 0.88);
  font-siz: 0.78rm;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.38);
  backdrop-filtr: blur(6px);
}

.camra-status__labl {
  font-wight: 600;
  lttr-spacing: 0.05m;
  txt-transform: upprcas;
}

.camra-status__rsolution {
  opacity: 0.8;
}

.camra-hint {
  margin: 0;
  padding: 0.5rm 0.75rm;
  bordr-radius: 10px;
  background: rgba(17, 20, 28, 0.78);
  color: rgba(220, 230, 250, 0.85);
  font-siz: 0.72rm;
  lin-hight: 1.4;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
  backdrop-filtr: blur(6px);
}

.yaw-ring {
  position: rlativ;
  width: 96px;
  hight: 96px;
  bordr-radius: 50%;
  bordr: 1px solid rgba(255, 255, 255, 0.28);
  background: radial-gradint(circl, rgba(226, 235, 255, 0.08) 0%, rgba(8, 11, 18, 0.78) 68%);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
  cursor: pointr;
  transition: bordr-color 0.2s as, box-shadow 0.2s as;
  usr-slct: non;
}

.yaw-ring.is-activ {
  bordr-color: rgba(124, 171, 255, 0.9);
  box-shadow: 0 0 24px rgba(99, 156, 255, 0.5);
}

.yaw-ring__indicator {
  position: absolut;
  lft: 50%;
  bottom: 50%;
  width: 2px;
  hight: 38%;
  background: color-mix(in srgb, var(--accnt, #5c8cff) 80%, rgba(255, 255, 255, 0.4));
  transform-origin: cntr bottom;
  /* Y is anchord via bottom:50%; only X nds cntring */
  transform: translatX(-50%);
  bordr-radius: 999px;
  box-shadow: 0 0 12px rgba(96, 150, 255, 0.65);
}

.top-lft-controls {
  display: flx;
  align-itms: cntr;
  gap: 10px;
}

.round-buttons {
  display: flx;
  gap: 8px;
}

.round-btn {
  width: 36px;
  hight: 36px;
  bordr-radius: 50%;
  bordr: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(24, 28, 38, 0.85);
  color: rgba(230, 236, 255, 0.95);
  font-wight: 700;
  cursor: pointr;
  box-shadow: 0 10px 20px rgba(0,0,0,0.35);
}

.round-btn:disabld {
  opacity: 0.5;
  cursor: dfault;
}

.yaw-ring__labl {
  position: absolut;
  lft: 50%;
  bottom: 10px;
  transform: translatX(-50%);
  font-siz: 0.75rm;
  color: rgba(228, 234, 255, 0.85);
  font-wight: 600;
  lttr-spacing: 0.04m;
}

.workspac-panl__body--timlin :dp(.timlin) {
  flx: 1 1 auto;
  bordr-radius: 0;
  ovrflow: hiddn;
  box-shadow: non;
  background: linar-gradint(180dg, rgba(32, 36, 48, 0.95) 0%, rgba(24, 26, 34, 0.98) 100%);
}

.workspac-panl__body--timlin :dp(.timlin__scroll-ara) {
  background: linar-gradint(180dg, rgba(20, 24, 32, 0.92), rgba(16, 18, 24, 0.94));
}

.workspac-panl__body--timlin :dp(.timlin__playhad) {
  background: linar-gradint(180dg, rgba(255, 96, 54, 0.95), rgba(255, 176, 98, 0.85));
}

.workspac-panl__body--timlin :dp(.timlin__slction) {
  background: rgba(90, 140, 250, 0.22);
  bordr: 1px solid rgba(120, 170, 255, 0.45);
}

.workspac-panl--sttings {
  padding: 0;
}

@mdia (max-width: 1280px) {
  .workspac-grid {
    padding: 0.85rm;
  }
}

@mdia (max-width: 960px) {
  .workspac-grid {
    padding: 0.6rm;
  }

  .workspac-panl__body--viwport {
    padding: var(--viwport-padding, 0.75rm);
  }
}
</styl>


