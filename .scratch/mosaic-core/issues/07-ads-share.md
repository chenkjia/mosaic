# 07 广告与分享接入

Status: todo
依赖：01、04
关联：REQ-001（商业化）、REQ-002

## 目标

在 platform adapter 内接入激励视频与分享，未配置广告位时走模拟广告。

## 验收项

- `showRewardedAd(placement)` 支持 `revive` / `extraBall` / `doubleCoins`，返回是否完整观看。
- 无 `AD_UNIT_ID` 时走模拟广告层，web/微信/抖音同链路。
- 复活每关仅一次；额外球只影响本关初始球；双倍金币结算数值正确。
- 分享调用平台 `share`，带标题/封面/query；V1 不发奖励、无邀请码。
- 广告与分享代码只在 platform adapter 内；业务层不出现 `wx`/`tt`。
- 真机走查清单产出（广告三通道、分享、复活灰态）。
