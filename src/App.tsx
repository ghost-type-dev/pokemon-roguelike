import { RoguelikePage } from './roguelike/RoguelikePage'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-purple-400 mb-6">Pokemon Roguelike</h1>
        <RoguelikePage />
      </div>
    </div>
  )
}
