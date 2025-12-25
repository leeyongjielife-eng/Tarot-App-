
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { Loader2, Sparkles, MoveRight, RotateCcw, Sun, Moon, Star, Cloud, Flame, Droplets, Leaf, Shield, Crown, Image as ImageIcon } from 'lucide-react';

// --- Tarot Data ---
const MAJOR_ARCANA = [
  "The Fool (愚者)", "The Magician (魔术师)", "The High Priestess (女祭司)", "The Empress (皇后)", 
  "The Emperor (皇帝)", "The Hierophant (教皇)", "The Lovers (恋人)", "The Chariot (战车)", 
  "Strength (力量)", "The Hermit (隐士)", "Wheel of Fortune (命运之轮)", "Justice (正义)", 
  "The Hanged Man (倒吊人)", "Death (死神)", "Temperance (节制)", "The Devil (恶魔)", 
  "The Tower (高塔)", "The Star (星星)", "The Moon (月亮)", "The Sun (太阳)", 
  "Judgement (审判)", "The World (世界)"
];

const SUITS = ["Wands (权杖)", "Cups (圣杯)", "Swords (宝剑)", "Pentacles (星币)"];
const RANKS = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];

const FULL_DECK = [
  ...MAJOR_ARCANA,
  ...SUITS.flatMap(suit => RANKS.map(rank => `${rank} of ${suit}`))
];

// --- Types ---
type AppState = 'input' | 'shuffling' | 'selecting' | 'reading';

interface CardData {
  name: string;
  isReversed: boolean;
  id: number;
  originalIndex?: number;
  imageUrl?: string;
}

// --- Helpers ---
const toRoman = (num: number) => {
  if (num === 0) return "0"; 
  const lookup: {[key:string]: number} = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
  let roman = '', i;
  for ( i in lookup ) {
    while ( num >= lookup[i] ) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
}

const getCardMetadata = (name: string) => {
  const isMajor = MAJOR_ARCANA.some(m => name.includes(m.split(' ')[0]));
  let number = "";
  let suit = "Major";
  let colorTheme = { sky: "from-indigo-900 to-purple-800", ground: "from-purple-900 to-black", accent: "text-yellow-400" };
  let Icon = Star;

  if (isMajor) {
    const index = MAJOR_ARCANA.indexOf(name);
    number = index !== -1 ? toRoman(index) : "";
    
    // Custom icons for some majors
    if (name.includes("Sun")) { Icon = Sun; colorTheme = { sky: "from-orange-300 to-yellow-200", ground: "from-green-600 to-green-800", accent: "text-orange-500" }; }
    else if (name.includes("Moon")) { Icon = Moon; colorTheme = { sky: "from-blue-900 to-slate-800", ground: "from-slate-900 to-black", accent: "text-blue-200" }; }
    else if (name.includes("Star")) { Icon = Star; colorTheme = { sky: "from-indigo-900 to-blue-600", ground: "from-indigo-950 to-purple-900", accent: "text-white" }; }
    else if (name.includes("Devil") || name.includes("Tower")) { Icon = Flame; colorTheme = { sky: "from-slate-900 to-red-900", ground: "from-black to-red-950", accent: "text-red-500" }; }
    else if (name.includes("Fool") || name.includes("World")) { Icon = Crown; colorTheme = { sky: "from-sky-300 to-blue-200", ground: "from-emerald-600 to-green-700", accent: "text-yellow-600" }; }
    else { Icon = Shield; }
  } else {
    // Minor Arcana
    if (name.includes("Wands")) { 
      suit = "Wands"; 
      colorTheme = { sky: "from-orange-100 to-yellow-100", ground: "from-orange-800 to-red-900", accent: "text-red-600" };
      Icon = Droplets;
    } else if (name.includes("Cups")) { 
      suit = "Cups"; 
      colorTheme = { sky: "from-blue-100 to-cyan-100", ground: "from-blue-700 to-indigo-900", accent: "text-blue-600" };
      Icon = Droplets;
    } else if (name.includes("Swords")) { 
      suit = "Swords"; 
      colorTheme = { sky: "from-slate-200 to-gray-300", ground: "from-slate-600 to-gray-800", accent: "text-slate-700" };
      Icon = Cloud;
    } else if (name.includes("Pentacles")) { 
      suit = "Pentacles"; 
      colorTheme = { sky: "from-yellow-50 to-amber-100", ground: "from-green-700 to-emerald-900", accent: "text-green-700" };
      Icon = Leaf;
    }
  }

  return { isMajor, number, suit, colorTheme, Icon };
}

// --- Components ---

function App() {
  const [gameState, setGameState] = useState<AppState>('input');
  const [question, setQuestion] = useState('');
  const [deck, setDeck] = useState<string[]>([]);
  const [selectedCards, setSelectedCards] = useState<CardData[]>([]);
  const [reading, setReading] = useState('');
  const [loadingReading, setLoadingReading] = useState(false);
  const [layoutSeed, setLayoutSeed] = useState(0);
  const [screenWidth, setScreenWidth] = useState(1000);

  // Initialize deck and resize listener
  useEffect(() => {
    setDeck(FULL_DECK);
    const updateWidth = () => setScreenWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isMobile = screenWidth < 768;

  // Generate circular layout
  const cardLayout = useMemo(() => {
    return Array.from({ length: 22 }).map((_, i) => {
      const totalCards = 22;
      const angleStep = 360 / totalCards;
      const baseAngleDeg = -90 + (i * angleStep);
      const angleRad = baseAngleDeg * (Math.PI / 180);
      const radius = isMobile ? 115 : 240;
      const randomR = (Math.random() - 0.5) * (isMobile ? 4 : 8);
      const randomAngle = (Math.random() - 0.5) * 2; 

      const finalRadius = radius + randomR;
      const finalAngleRad = angleRad + (randomAngle * Math.PI / 180);

      const x = Math.cos(finalAngleRad) * finalRadius;
      const y = Math.sin(finalAngleRad) * finalRadius;
      const rotation = baseAngleDeg + 90 + randomAngle;

      return { x, y, angle: rotation, z: i };
    });
  }, [layoutSeed, screenWidth, isMobile]);

  const handleStart = () => {
    if (!question.trim()) return;
    setGameState('shuffling');
    setLayoutSeed(prev => prev + 1);
    
    // Simulate shuffling time
    setTimeout(() => {
      setGameState('selecting');
    }, 2500);
  };

  const handleCardSelect = (index: number) => {
    if (selectedCards.length >= 3) return;

    const randomCardName = deck[Math.floor(Math.random() * deck.length)];
    const isReversed = Math.random() > 0.8; 

    const newCard: CardData = {
      name: randomCardName,
      isReversed,
      id: index
    };

    const newSelection = [...selectedCards, newCard];
    setSelectedCards(newSelection);

    if (newSelection.length === 3) {
      setTimeout(() => {
        setGameState('reading');
        generateReading(newSelection, question);
      }, 1000);
    }
  };

  const generateCardImage = async (cardName: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Draw the Tarot card "${cardName}". 
        Style: Classic Rider-Waite-Smith tarot deck style.
        Visuals: Vintage hand-drawn line art, woodcut aesthetics, muted watercolor tones (antique yellow, faded red/blue). 
        The image should be a direct illustration of the card's meaning with traditional symbolism.
        High quality, detailed, vertical aspect ratio.
        No text labels on the card itself if possible.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Image gen error for", cardName, error);
      return null;
    }
  };

  const generateReading = async (cards: CardData[], userQuestion: string) => {
    setLoadingReading(true);
    setReading('');

    // Trigger image generation in background
    cards.forEach(async (card) => {
       const imageUrl = await generateCardImage(card.name);
       if (imageUrl) {
         setSelectedCards(prev => prev.map(c => c.id === card.id ? { ...c, imageUrl } : c));
       }
    });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const cardDescription = cards.map((c, i) => 
        `Position ${i + 1}: ${c.name} ${c.isReversed ? '(Reversed/逆位)' : '(Upright/正位)'}`
      ).join('\n');

      const prompt = `
        You are a mystical and wise Tarot Reader. 
        The user has asked the following question: "${userQuestion}".
        
        The user has drawn the following 3 cards using a "Simple Relationship Spread" (1. Current Situation/Self, 2. The Obstacle/Environment, 3. The Outcome/Advice):
        ${cardDescription}

        Please provide a reading in Chinese (中文).
        Your tone should be mysterious, empathetic, and insightful.
        Structure your response:
        1. Brief interpretation of each card in its position.
        2. A synthesis of how they relate to the question.
        3. A final guiding sentence.
        
        Do not output JSON. Output formatted Markdown.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Tarot reader interpreting cards for a user.",
        }
      });

      setReading(response.text || "The spirits are silent. Please try again.");

    } catch (error) {
      console.error(error);
      setReading("An error occurred while communing with the spirits. Please check your connection and try again.");
    } finally {
      setLoadingReading(false);
    }
  };

  const resetGame = () => {
    setGameState('input');
    setQuestion('');
    setSelectedCards([]);
    setReading('');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#1a0b2e] to-black text-slate-100 font-serif overflow-hidden relative">
      {/* Background Stars Effect */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        
        {/* Header */}
        <header className="absolute top-0 w-full p-6 text-center z-20">
          <h1 className="text-3xl md:text-4xl text-yellow-500/80 tracking-[0.2em] uppercase font-light">
            Destiny Tarot
          </h1>
        </header>

        <main className="w-full flex flex-col items-center justify-center min-h-[70vh]">
          
          {gameState === 'input' && (
            <div className="animate-fadeIn w-full max-w-lg text-center space-y-8 p-8 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl shadow-purple-900/20">
              <Sparkles className="w-12 h-12 text-yellow-400 mx-auto animate-pulse" />
              
              <div className="space-y-2">
                <h2 className="text-2xl text-purple-100">What does your soul seek answers for?</h2>
                <h3 className="text-lg text-purple-200/90 font-serif">你想向塔罗牌询问什么指引？</h3>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Focus deeply on your question before proceeding.</p>
                <p className="text-[10px] text-slate-500 tracking-wide">
                  此占卜属于娱乐性质，请勿过分相信<br/>
                  (For entertainment purposes only)
                </p>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., 我的感情运势如何？"
                  className="w-full bg-slate-900/80 border border-purple-500/30 rounded-lg px-4 py-4 text-center text-lg focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder:text-slate-600"
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                />
                <button
                  onClick={handleStart}
                  disabled={!question.trim()}
                  className="group relative px-8 py-3 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-full text-yellow-100 tracking-widest uppercase text-sm font-semibold hover:from-purple-800 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 border border-white/10"
                >
                  <span className="flex items-center gap-2">
                    Begin Divination <MoveRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </div>
            </div>
          )}

          {gameState === 'shuffling' && (
            <div className="flex flex-col items-center justify-center space-y-8">
              <div className="relative w-48 h-72">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute inset-0 bg-gradient-to-br from-indigo-950 to-purple-950 border border-yellow-900/50 rounded-xl shadow-xl"
                    style={{
                      transform: `translate(${i * 2}px, ${i * -2}px)`,
                      zIndex: i
                    }}
                  >
                    <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
                    <div className="absolute inset-2 border border-yellow-500/20 rounded-lg"></div>
                  </div>
                ))}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 border border-yellow-600 rounded-xl shadow-2xl animate-[shuffle_1s_ease-in-out_infinite] z-10">
                   <div className="w-full h-full flex items-center justify-center">
                     <div className="w-16 h-16 border-2 border-yellow-500/30 rounded-full flex items-center justify-center">
                        <div className="w-12 h-12 border border-yellow-500/50 rotate-45"></div>
                     </div>
                   </div>
                </div>
              </div>
              <div className="text-xl text-yellow-100/80 animate-pulse tracking-widest">
                The cards are cleansing...
              </div>
              <p className="text-xs text-purple-300/50 uppercase tracking-[0.3em]">Channeling Energy</p>
            </div>
          )}

          {gameState === 'selecting' && (
            <div className="w-full flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-2 animate-fadeIn mb-4">
                <h2 className="text-2xl text-purple-100">Select 3 Cards</h2>
                <p className="text-yellow-500/80 font-mono text-sm">
                  {selectedCards.length} / 3 Selected
                </p>
              </div>
              
              {/* Circular Display Container */}
              <div className={`relative w-full flex justify-center items-center mb-8 ${isMobile ? 'h-[400px]' : 'h-[650px]'}`}>
                {/* Center Point Anchor */}
                <div className="absolute top-1/2 left-1/2 w-0 h-0">
                  {cardLayout.map((layout, i) => {
                     const isSelected = selectedCards.find(c => c.id === i);
                     if (isSelected) return null; 

                     return (
                       <div
                          key={i}
                          onClick={() => handleCardSelect(i)}
                          className={`absolute bg-gradient-to-br from-indigo-950 to-slate-900 border border-yellow-600/40 rounded-lg cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(234,179,8,0.5)] flex items-center justify-center ${isMobile ? 'w-20 h-32' : 'w-32 h-52'}`}
                          style={{
                            // Transform: Translate from center (0,0) to (x,y) then rotate
                            transform: `translate(calc(-50% + ${layout.x}px), calc(-50% + ${layout.y}px)) rotate(${layout.angle}deg)`, 
                            zIndex: layout.z,
                            boxShadow: '-2px 2px 10px rgba(0,0,0,0.5)'
                          }}
                       >
                         <div className="w-full h-full flex items-center justify-center opacity-40 overflow-hidden rounded-lg relative">
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#000_5px,#000_10px)] opacity-20"></div>
                            <div className="w-12 h-12 md:w-16 md:h-16 border-2 border-yellow-500/30 rounded-full flex items-center justify-center">
                              <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
                            </div>
                         </div>
                       </div>
                     );
                  })}
                </div>
              </div>

              {/* Selected Placeholders */}
              <div className="flex gap-4 md:gap-8 h-40 md:h-52 items-center justify-center z-20">
                {[0, 1, 2].map((slot) => {
                  const card = selectedCards[slot];
                  return (
                    <div key={slot} className={`relative w-20 h-32 md:w-32 md:h-52 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center transition-all bg-black/20 ${card ? 'border-none' : ''}`}>
                      {!card && <span className="text-white/20 text-2xl font-bold">{slot + 1}</span>}
                      {card && (
                         <div className="animate-popIn absolute inset-0 bg-gradient-to-b from-yellow-900 to-purple-900 rounded-lg border border-yellow-400/50 shadow-lg flex items-center justify-center">
                            <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 absolute inset-0"></div>
                            <span className="text-4xl animate-pulse">🔮</span>
                         </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {gameState === 'reading' && (
            <div className="w-full h-full max-w-7xl animate-fadeIn flex flex-col md:flex-row gap-8 items-start justify-center p-4">
              
              {/* LEFT COLUMN: 1/3 Width - Cards Stacked Vertically */}
              <div className="w-full md:w-1/3 flex flex-col gap-6 order-2 md:order-1">
                {selectedCards.map((card, index) => {
                  const { number, colorTheme, Icon } = getCardMetadata(card.name);
                  const cleanName = card.name.split('(')[0].replace('The ', '');
                  const chineseName = card.name.match(/\((.*?)\)/)?.[1] || "";
                  
                  return (
                    <div key={index} className="flex flex-row items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/5 hover:bg-black/60 transition-colors">
                      
                      {/* Rider-Waite Style Card Visual */}
                      <div className={`relative w-32 h-56 shrink-0 bg-[#eae6ca] rounded shadow-2xl transition-transform hover:scale-105 duration-500 ${card.isReversed ? 'rotate-180' : ''}`}>
                         {/* Card Border */}
                         <div className="absolute inset-[6px] border border-slate-900/40 flex flex-col bg-white">
                            
                            {/* Inner Content Container */}
                            <div className="flex-1 flex flex-col p-[2px] overflow-hidden">
                               {/* Image Area */}
                               <div className="relative flex-1 border border-slate-900/60 overflow-hidden flex flex-col bg-[#fffce6]">
                                  
                                  {card.imageUrl ? (
                                    <img src={card.imageUrl} alt={cleanName} className="w-full h-full object-cover" />
                                  ) : (
                                    <>
                                      {/* Placeholder while generating */}
                                      <div className={`h-2/3 w-full bg-gradient-to-b ${colorTheme.sky}`}></div>
                                      <div className={`h-1/3 w-full bg-gradient-to-b ${colorTheme.ground}`}></div>
                                      <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
                                      <div className="absolute inset-0 flex items-center justify-center drop-shadow-xl">
                                          <Loader2 className="w-8 h-8 text-slate-900 animate-spin opacity-50" />
                                      </div>
                                    </>
                                  )}
                                  
                                  {/* Roman Number Overlay */}
                                  {number && !card.imageUrl && (
                                    <div className="absolute top-1 left-0 right-0 text-center">
                                      <span className="bg-white/80 px-2 py-[1px] text-[10px] font-bold text-slate-900 border border-slate-900/20 rounded shadow-sm">{number}</span>
                                    </div>
                                  )}
                               </div>

                               {/* Title Area */}
                               <div className="h-10 flex flex-col items-center justify-center bg-white mt-[2px] border border-slate-900/10 z-10">
                                   <span className="text-[10px] uppercase font-bold text-slate-900 tracking-wider text-center leading-none mb-[2px]">
                                     {cleanName}
                                   </span>
                                   {chineseName && (
                                     <span className="text-[8px] text-slate-600 scale-90">
                                       {chineseName}
                                     </span>
                                   )}
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Card Info Side Text */}
                      <div className="flex flex-col gap-1 text-slate-300">
                        <div className="text-xs uppercase tracking-widest text-yellow-600 font-bold">
                           {index === 0 ? "I. The Self" : index === 1 ? "II. The Obstacle" : "III. The Guidance"}
                        </div>
                        <h3 className="text-lg font-serif text-yellow-100">{cleanName}</h3>
                        <p className="text-sm text-slate-500">{card.isReversed ? 'Reversed (逆位)' : 'Upright (正位)'}</p>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* RIGHT COLUMN: 2/3 Width - The Interpretation */}
              <div className="w-full md:w-2/3 bg-black/80 backdrop-blur-xl border border-yellow-900/30 rounded-xl p-8 md:p-12 shadow-2xl order-1 md:order-2 flex flex-col relative min-h-[600px]">
                
                <div className="mb-8 border-b border-white/10 pb-6">
                   <p className="text-xs text-yellow-600 uppercase tracking-widest mb-2">The Querent Asks</p>
                   <p className="text-2xl md:text-3xl text-yellow-100/90 font-serif italic leading-relaxed">"{question}"</p>
                </div>

                {loadingReading ? (
                   <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-purple-200/50 py-20">
                     <div className="relative">
                       <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-20 animate-pulse"></div>
                       <Loader2 className="w-16 h-16 animate-spin text-yellow-500 relative z-10" />
                     </div>
                     <p className="animate-pulse font-serif tracking-widest text-lg">Consulting the Ancient Wisdom...</p>
                   </div>
                ) : (
                  <div className="prose prose-invert prose-lg prose-p:text-slate-300 prose-headings:text-yellow-500/90 max-w-none animate-fadeIn leading-loose font-serif">
                     <div className="whitespace-pre-wrap">{reading}</div>
                  </div>
                )}

                {!loadingReading && (
                  <div className="mt-12 pt-8 border-t border-white/10 flex justify-center">
                    <button 
                      onClick={resetGame}
                      className="group flex items-center gap-3 text-sm uppercase tracking-[0.2em] text-slate-500 hover:text-yellow-400 transition-colors px-6 py-3 border border-transparent hover:border-white/10 rounded-full"
                    >
                      <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" /> Consult Again
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </main>
      </div>
      
      {/* Styles for custom animations not in standard tailwind */}
      <style>{`
        @keyframes shuffle {
          0%, 100% { transform: translateY(0) rotate(0); }
          25% { transform: translateY(-10px) rotate(-2deg); }
          50% { transform: translateY(0) rotate(0); }
          75% { transform: translateY(-5px) rotate(2deg); }
        }
        .animate-popIn {
          animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
