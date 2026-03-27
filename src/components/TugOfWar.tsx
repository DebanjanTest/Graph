import React from 'react';
import { motion } from 'motion/react';
import { ComparisonData } from '../types';

interface TugOfWarProps {
  data: ComparisonData;
  targetCountry: string;
}

export const TugOfWar: React.FC<TugOfWarProps> = ({ data, targetCountry }) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div className="text-left">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">India</p>
          <p className="text-2xl font-bold text-white">{data.indiaValue}{data.unit}</p>
        </div>
        <div className="text-center pb-1">
          <p className="text-sm font-medium text-slate-400">{data.metric}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">{targetCountry}</p>
          <p className="text-2xl font-bold text-white">{data.targetValue}{data.unit}</p>
        </div>
      </div>

      {/* Tug of War Slider */}
      <div className="relative h-12 flex items-center">
        {/* Track */}
        <div className="absolute inset-0 h-2 my-auto bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-slate-400 to-orange-500"
            style={{ width: '100%' }}
          />
        </div>

        {/* Center Marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 z-10" />

        {/* Indicator (The Rope Knot) */}
        <motion.div 
          className="absolute z-20"
          initial={{ left: '50%' }}
          animate={{ left: `${data.leaning}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        >
          <div className="w-8 h-8 -ml-4 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] flex items-center justify-center border-4 border-slate-900">
            <div className={`w-2 h-2 rounded-full ${data.advantage === 'india' ? 'bg-blue-500' : data.advantage === 'target' ? 'bg-orange-500' : 'bg-slate-400'}`} />
          </div>
          
          {/* Label */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded ${
              data.advantage === 'india' ? 'bg-blue-500/20 text-blue-400' : 
              data.advantage === 'target' ? 'bg-orange-500/20 text-orange-400' : 
              'bg-slate-800 text-slate-500'
            }`}>
              {data.advantage === 'india' ? 'India Dominance' : 
               data.advantage === 'target' ? `${targetCountry} Advantage` : 
               'Parity'}
            </span>
          </div>
        </motion.div>
      </div>

      <div className="pt-4 grid grid-cols-2 gap-4 text-[11px] font-mono">
        <div className="p-2 bg-slate-800/30 rounded border border-slate-700/50">
          <p className="text-slate-500 mb-1">DELTA</p>
          <p className="text-white">
            {Math.abs(data.indiaValue - data.targetValue).toFixed(2)}{data.unit}
          </p>
        </div>
        <div className="p-2 bg-slate-800/30 rounded border border-slate-700/50">
          <p className="text-slate-500 mb-1">PROFITABILITY LEAN</p>
          <p className={data.advantage === 'india' ? 'text-blue-400' : 'text-orange-400'}>
            {data.advantage === 'india' ? '+' : '-'}{(Math.abs(50 - data.leaning) * 2).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};
