import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js'

export function createLoader(manager) {
  return new MMDLoader(manager)
}
