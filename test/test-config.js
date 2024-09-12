import path from 'path'

let __dirname = import.meta.dirname
if (!__dirname) {
  __dirname = path.dirname(import.meta.url.replace(/^\w+:\/\//,''))
}

export const scriptPath = path.resolve(__dirname, '../index.js')
export const tempDir = path.resolve(__dirname, '../test_projects')
