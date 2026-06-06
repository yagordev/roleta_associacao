import { useEffect, useRef, useState } from 'react';

export interface WheelData {
  option: string;
  style: { backgroundColor: string; textColor: string };
}

interface CustomWheelProps {
  mustStartSpinning: boolean;
  prizeNumber: number;
  data: WheelData[];
  onStopSpinning: () => void;
  onTick: () => void;
  spinDuration?: number; // em segundos
}

// Função de Easing: easeOutQuart (desaceleração realista)
function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - x, 4);
}

export function CustomWheel({
  mustStartSpinning,
  prizeNumber,
  data,
  onStopSpinning,
  onTick,
  spinDuration = 6, // 6 segundos de giro por padrão
}: CustomWheelProps) {
  const wheelRef = useRef<SVGSVGElement>(null);
  
  const [rotation, setRotation] = useState(0); // Rotação atual visual
  
  // Refs para gerenciar o estado dentro do requestAnimationFrame sem recriar
  const currentRotationRef = useRef(0);
  const isSpinningRef = useRef(false);
  const lastTickAngleRef = useRef(0);

  const numSlices = data.length;
  const sliceAngle = 360 / numSlices;
  
  // Quando o mustStartSpinning mudar para true, inicia a animação
  useEffect(() => {
    if (mustStartSpinning && !isSpinningRef.current && data.length > 0) {
      startSpinAnimation();
    }
  }, [mustStartSpinning]);

  const startSpinAnimation = () => {
    isSpinningRef.current = true;
    
    // Onde queremos parar?
    // O prêmio 0 fica no topo em 0 graus. O prêmio 'i' precisa de uma rotação contrária para ficar no topo.
    // Como a roleta gira em sentido horário (+), o ângulo para o prêmio 'i' estar no topo é: 360 - (i * sliceAngle)
    
    const targetSliceCenter = 360 - (prizeNumber * sliceAngle);
    
    // Adicionar um fator aleatório dentro da fatia para não parar sempre cravado no meio
    // O ponteiro tem a largura de uma fatia. Vamos variar no meio dela (evitando as bordas pra não causar dúvida)
    const randomOffset = (Math.random() * (sliceAngle * 0.8)) - (sliceAngle * 0.4); 
    
    // Rotação alvo base
    let finalAngle = targetSliceCenter + randomOffset;
    
    // Garante que o finalAngle seja positivo e a frente da rotação atual
    // Vamos dar 8 voltas completas (8 * 360 = 2880 graus) antes de parar
    const extraSpins = 360 * 8; 
    
    // Pega o resto da rotação atual para não voltar pra trás
    const currentBase = currentRotationRef.current % 360;
    
    // Se o ângulo final for menor que o atual na volta atual, precisa de +360
    if (finalAngle < currentBase) {
      finalAngle += 360;
    }
    
    const targetRotation = currentRotationRef.current + extraSpins + (finalAngle - currentBase);
    
    // Duração total em ms
    const durationMs = spinDuration * 1000;
    const startTime = performance.now();
    const startRotation = currentRotationRef.current;
    
    // Zera o rastreador de ticks para a nova rodada
    lastTickAngleRef.current = startRotation;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      let progress = elapsed / durationMs;
      
      if (progress >= 1) {
        progress = 1;
      }
      
      // Aplica a função de desaceleração
      const easedProgress = easeOutQuart(progress);
      
      // Calcula a rotação atual baseada no progresso
      const currentAngle = startRotation + (targetRotation - startRotation) * easedProgress;
      
      currentRotationRef.current = currentAngle;
      setRotation(currentAngle);
      
      // --- Lógica do Som de TICK ---
      // Verifica se a rotação passou por uma divisória de fatia.
      // Uma divisória passa pelo ponteiro quando o (angulo % sliceAngle) = 0.
      
      const currentSliceIndex = Math.floor((currentAngle + (sliceAngle / 2)) / sliceAngle);
      const lastSliceIndex = Math.floor((lastTickAngleRef.current + (sliceAngle / 2)) / sliceAngle);
      
      if (currentSliceIndex > lastSliceIndex) {
        // Passamos por uma divisória! Toca o som.
        onTick();
        lastTickAngleRef.current = currentAngle;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Fim da animação
        isSpinningRef.current = false;
        onStopSpinning();
      }
    };

    requestAnimationFrame(animate);
  };

  // Funções auxiliares para desenhar os triângulos SVG
  const getCoordinatesForPercent = (percent: number, radius: number) => {
    // Começa de -90 graus para que o prêmio 0 fique centralizado no topo (meio-dia)
    const x = Math.cos(2 * Math.PI * percent - Math.PI / 2) * radius;
    const y = Math.sin(2 * Math.PI * percent - Math.PI / 2) * radius;
    return [x, y];
  };

  const drawSlice = (index: number) => {
    const percentStart = (index * sliceAngle - sliceAngle / 2) / 360;
    const percentEnd = ((index + 1) * sliceAngle - sliceAngle / 2) / 360;
    
    const radius = 100;
    const [startX, startY] = getCoordinatesForPercent(percentStart, radius);
    const [endX, endY] = getCoordinatesForPercent(percentEnd, radius);
    
    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

    return `M startX startY A radius radius 0 largeArcFlag 1 endX endY L 0 0`
      .replace('startX', startX.toString())
      .replace('startY', startY.toString())
      .replace(/radius/g, radius.toString())
      .replace('largeArcFlag', largeArcFlag.toString())
      .replace('endX', endX.toString())
      .replace('endY', endY.toString());
  };

  if (numSlices === 0) return null;

  return (
    <div className="relative w-full h-full aspect-square flex items-center justify-center">
      
      {/* O Ponteiro / Agulha no Topo */}
      <div 
        className="absolute z-20 top-[-24px] left-1/2 -translate-x-1/2"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
      >
        <svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 0 H28 C30.2091 0 32 1.79086 32 4 V10 L16 44 L0 10 V4 C0 1.79086 1.79086 0 4 0 Z" fill="#E53935"/>
        </svg>
      </div>

      {/* Círculo Central Decorativo */}
      <div className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] h-[15%] bg-white rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] border-4 border-[#0D47A1]"></div>

      {/* Borda Externa Decorativa */}
      <div className="absolute inset-[-4%] rounded-full bg-[#0D47A1] shadow-[inset_0_0_20px_rgba(0,0,0,0.5),_0_10px_30px_rgba(0,0,0,0.3)] z-0 pointer-events-none border-8 border-white/20"></div>

      {/* A Roleta (SVG) */}
      <svg
        ref={wheelRef}
        viewBox="-100 -100 200 200"
        className="w-full h-full rounded-full z-0 overflow-hidden shadow-inner"
        style={{
          transform: `rotate(${rotation}deg)`,
          willChange: 'transform',
        }}
      >
        {data.map((item, index) => {
          const textRotation = index * sliceAngle;
          
          return (
            <g key={index}>
              <path
                d={drawSlice(index)}
                fill={item.style.backgroundColor}
                stroke="#ffffff"
                strokeWidth="1"
              />
              
              <g transform={`rotate(${textRotation})`}>
                <text
                  x="0"
                  y="-30"
                  fill={item.style.textColor}
                  textAnchor="start"
                  alignmentBaseline="middle"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="'Inter', sans-serif"
                  style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.6)' }}
                  transform="rotate(-90, 0, -30)" 
                >
                  {item.option}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      
    </div>
  );
}
