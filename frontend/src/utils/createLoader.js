import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin } from '@pixiv/three-vrm'

export function createLoader(manager) {
  const loader = new GLTFLoader(manager)
  // Enable VRM loading via plugin
  loader.register(parser => new VRMLoaderPlugin(parser))
  return loader
}


