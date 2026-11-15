import { Droplets, HardHat, Hotel, FileSearch, Megaphone } from 'lucide-react'

export const districts = {
  water: {name: 'Agua', place: 'Estación de agua', x: -22, z: -2, color: '#63d6e1', icon: Droplets},
  contract: {name: 'Obras', place: 'Obras públicas', x: -12, z: -12, color: '#ffd879', icon: HardHat},
  hotel: {name: 'Hotel', place: 'Paseo hotelero', x: 19, z: -12, color: '#ff9b8e', icon: Hotel},
  audit: {name: 'Auditoría', place: 'Contraloría', x: 24, z: 2, color: '#c6adfc', icon: FileSearch},
  protest: {name: 'Protesta', place: 'Plaza del Zumbido', x: 2, z: 5, color: '#a8e49d', icon: Megaphone},
} as const
export type District = keyof typeof districts
export const districtOrder = Object.keys(districts) as District[]
