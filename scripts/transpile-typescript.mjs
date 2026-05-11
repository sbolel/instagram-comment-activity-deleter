import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export function transpileTypeScript(source, fileName) {
  const ts = loadTypeScript()
  const result = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      sourceMap: false,
    },
    reportDiagnostics: true,
  })

  const diagnostics = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? []
  if (diagnostics.length > 0) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (name) => name,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    })
    throw new Error(`Failed to transpile ${fileName}\n${formatted}`)
  }

  return result.outputText.replace(/^export \{\};\s*$/gm, '')
}

function loadTypeScript() {
  try {
    return require('typescript')
  } catch (error) {
    if (process.env.TYPESCRIPT_PACKAGE) {
      return require(process.env.TYPESCRIPT_PACKAGE)
    }

    throw new Error(
      'The build requires the TypeScript package. Run npm install first, or set TYPESCRIPT_PACKAGE to a TypeScript package path.',
      { cause: error },
    )
  }
}
