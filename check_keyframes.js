// ブラウザのコンソールで実行してキーフレームデータを確認
const data = JSON.parse(localStorage.getItem('timeline') || '{}');
console.log('Keyframes:', data.keyframes);
if (data.keyframes && data.keyframes.length > 0) {
  console.log('First keyframe values:', data.keyframes[0].values);
  console.log('Has morphs?', !!data.keyframes[0].values?.morphs);
  console.log('Has shapeKeys?', !!data.keyframes[0].values?.shapeKeys);
  console.log('Has fingers?', !!data.keyframes[0].values?.fingers);
}
