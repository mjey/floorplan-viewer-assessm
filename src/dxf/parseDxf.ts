import DxfParser, { type IDxf } from 'dxf-parser'

export class DxfParseError extends Error {
  override readonly name = 'DxfParseError'

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

/**
 * Thin wrapper over `dxf-parser` so the rest of the app never imports the library
 * directly. Swapping the parser later means changing this one file.
 */
export function parseDxf(source: string): IDxf {
  let parsed: IDxf | null
  try {
    parsed = new DxfParser().parseSync(source)
  } catch (cause) {
    throw new DxfParseError('The floorplan file could not be parsed as DXF.', { cause })
  }
  if (!parsed) {
    throw new DxfParseError('The floorplan file is empty or not a DXF document.')
  }
  return parsed
}
