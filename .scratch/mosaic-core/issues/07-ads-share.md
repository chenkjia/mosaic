# 07 广告与分享接入

Status: done
依赖：01、04
关联：REQ-001（商业化）、REQ-002

## 目标

在 platform adapter 内接入激励视频与分享，未配置广告位时走模拟广告。

## 验收项

- `showRewardedAd(placement)` 支持 `revive` / `skill`，返回是否完整观看。
- 无 `AD_UNIT_ID` 时走模拟广告层，web/微信/抖音同链路。
- 复活每关仅一次；技能广告由点击可用技能格直接拉起（无确认弹层，发球前准备态也可用），看完立即施放对应技能，广告期间整局暂停、时间冻结；不可用技能格不拉广告。
- 分享调用平台 `share`，带标题/封面/query；V1 不发奖励、无邀请码。
- 广告与分享代码只在 platform adapter 内；业务层不出现 `wx`/`tt`。
- 真机走查清单产出（广告两通道、分享、复活灰态）。

## 实施记录

- 产物：`platform/minigame.js`（SDK 广告、分享、模拟广告回退）、`config/ads.js`（`AD_UNIT_ID` / 分点位 `AD_UNIT_IDS` 配置源，entries 注入）、play/home 的广告与分享交互、`docs/verify/device-checklist.md`。
- 决定：广告位为空时走 3 秒模拟广告；每点位可独立配置，缺省回退总 ID；分享封面直接用包内相对路径 `assets/share/cover.png`（单包后不再补前缀）；分享 V1 不发奖励；业务层只调用 `platform.showRewardedAd` / `platform.share`。2026-10-22 起 `doubleCoins` 点位随金币体系移除，替换为空技能格补给 `skillCharge`。
- 验证：web 三通道模拟广告全部发奖正确（额外球、复活、技能补给）；补给广告中 `adBusy=true / paused=true / sim.time` 冻结，结束后 `charges[i]=1`；复活二次失败按钮置灰；`d.share()` 在无 `navigator.share` 的 Chromium 返回 false 且 UI 有回退提示；`verify-dist` 确认微信/抖音包内无 `wx.`/`tt.` 泄漏。
- 后续（2026-10-23）：广告点位收缩为 `revive` / `skill` 两处，移除 `extraBall`（预开局只剩「开始」）与 `skillCharge`（技能格点击直接拉广告、看完即施放，无确认弹层）；预开局阶段也能看技能广告，广告期间整局暂停。配置源删除 `AD_UNIT_IDS.extraBall`。同日直接开局轮删除预开局弹层，启动/重开/下一关直接进入准备态，技能广告在准备态仍可用。
- 遗留：真实广告位与平台分享卡片未在真机执行，清单第 4、5 节交用户。
