import { parseSensorFeed, SensorDataError } from './schema'

const validSensor = {
  id: 's1',
  label: 'Aisle A-01',
  position: { x: 5200, y: -2300 },
  readings: [{ timestamp: '2026-08-24T08:00:00Z', temperatureC: 20.5, humidityPct: 45 }],
}

describe('parseSensorFeed', () => {
  it('accepts a well-formed feed and returns typed sensors', () => {
    const [sensor] = parseSensorFeed([validSensor])

    expect(sensor).toEqual(validSensor)
  })

  it('accepts a sensor with no readings yet', () => {
    expect(parseSensorFeed([{ ...validSensor, readings: [] }])[0]?.readings).toEqual([])
  })

  it.each([
    ['not an array', { sensors: [] }, /must be an array of sensors/],
    ['missing id', [{ ...validSensor, id: undefined }], /\[0\]\.id must be a non-empty string/],
    ['bad position', [{ ...validSensor, position: { x: '5200', y: 0 } }], /\[0\]\.position\.x/],
    ['readings not array', [{ ...validSensor, readings: {} }], /\[0\]\.readings must be an array/],
    [
      'non-finite temperature',
      [{ ...validSensor, readings: [{ ...validSensor.readings[0], temperatureC: NaN }] }],
      /\[0\]\.readings\[0\]\.temperatureC must be a finite number/,
    ],
    ['duplicate ids', [validSensor, validSensor], /Duplicate sensor id "s1"/],
  ])('rejects %s with a path-qualified error', (_name, input, message) => {
    expect(() => parseSensorFeed(input)).toThrowError(SensorDataError)
    expect(() => parseSensorFeed(input)).toThrowError(message)
  })
})
