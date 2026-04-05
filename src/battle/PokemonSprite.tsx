import { Sprites } from '@pkmn/img'

interface PokemonSpriteProps {
  species: string
  side: 'p1' | 'p2'
  fainted?: boolean
}

export function PokemonSprite({ species, side, fainted }: PokemonSpriteProps) {
  const isFront = side === 'p2' // opponent faces us
  const spriteData = Sprites.getPokemon(species, {
    gen: 'gen5ani',
    side: isFront ? 'p2' : 'p1',
  })

  return (
    <div
      className={`transition-all duration-300 ${fainted ? 'opacity-0 translate-y-4' : 'opacity-100'}`}
    >
      <img
        src={spriteData.url}
        width={spriteData.w}
        height={spriteData.h}
        alt={species}
        className={spriteData.pixelated ? 'pixelated' : ''}
        style={{ imageRendering: spriteData.pixelated ? 'pixelated' : 'auto' }}
      />
    </div>
  )
}
