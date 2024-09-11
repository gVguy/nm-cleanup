import path from 'path'
    
const __dirname = import.meta.dirname

export const scriptPath = path.resolve(__dirname, '../index.js')
export const tempDir = path.resolve(__dirname, '../temp_test_dir')
