import {
  BARREL_OPTIMIZATION_PREFIX,
  RSC_MODULE_TYPES,
} from '../../../shared/lib/constants'
import { getModuleBuildInfo } from './get-module-build-info'
import { regexCSS } from './utils'

export type ClientComponentImports = Record<string, Set<string>>
export type CssImports = Record<string, string[]>

export type NextFlightClientEntryLoaderOptions = {
  modules: string[] | string
  /** This is transmitted as a string to `getOptions` */
  server: boolean | 'true' | 'false'
}

export default function transformSource(this: any) {
  let { modules, server }: NextFlightClientEntryLoaderOptions =
    this.getOptions()
  const isServer = server === 'true'

  if (!Array.isArray(modules)) {
    modules = modules ? [modules] : []
  }

  const mods = modules || []
  const importsCode = mods
    .map((x) => JSON.parse(x))
    // Filter out CSS files in the SSR compilation
    .filter(([request]) => (isServer ? !regexCSS.test(request) : true))
    .map(([request, ...names]) => {
      const importPath = JSON.stringify(
        request.startsWith(BARREL_OPTIMIZATION_PREFIX)
          ? request.replace(':', '!=!')
          : request
      )
      if (names.includes('*')) {
        return `import(/* webpackMode: "eager" */ ${importPath})`
      } else {
        return `import(/* webpackMode: "eager" */ /* webpackExports: ${JSON.stringify(
          names
        )} */ ${importPath})`
      }
    })
    .join(';\n')

  const buildInfo = getModuleBuildInfo(this._module)

  buildInfo.rsc = {
    type: RSC_MODULE_TYPES.client,
  }

  const code = `
  // function callMod(m) { m }

  ${importsCode}

  // ${mods.map((_, index) => `callMod(_mod${index})`).join(';\n')}
  `

  // console.log(code)
  return code
}
