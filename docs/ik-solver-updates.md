# IK ソルバ関連の更新

- `usePoseControls` の `handleTransformEvent` でボーン名を `normalizeBoneName` で正規化し、末尾が `IK` かどうかを `/ik$/i` で判定するように修正しました。
- `useIkSolver` の `applyIKUpdate` では `helper.value.objects.get(mesh)?.ik?.solve()` を `helper.value.update(0)` の前に呼び出し、IK ソルバを確実に再計算するようにしました。

これらの変更により、ボーン名の表記揺れや IK 解決の遅延による不整合を防ぎ、今後の保守性を向上させます。

