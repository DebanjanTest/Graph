import React from 'react';
import { motion } from 'motion/react';
import { ComparisonData } from '../types';

interface TugOfWarProps {
  data: ComparisonData;
  targetCountry: string;
}

export const TugOfWar: React.FC<TugOfWarProps> = ({ data, targetCountry }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-end relative z-10">
        <div className="text-left">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Domestic</p>
          <p className="text-xs font-bold text-[#000080] uppercase tracking-widest mb-1">India</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{data.indiaValue}{data.unit}</p>
        </div>
        <div className="text-center pb-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1">{data.metric}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">International</p>
          <p className="text-xs font-bold text-[#FF9933] uppercase tracking-widest mb-1">{targetCountry}</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{data.targetValue}{data.unit}</p>
        </div>
      </div>

      {/* Tug of War Slider */}
      <div className="relative h-12 flex items-center z-10">
        {/* Track */}
        <div className="absolute inset-0 h-2 my-auto bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div 
            className="h-full bg-gradient-to-r from-[#000080] via-slate-200 to-[#FF9933]"
            style={{ width: '100%' }}
          />
        </div>

        {/* Center Marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10" />

        {/* Indicator */}
        <motion.div 
          className="absolute z-20"
          initial={{ left: '50%' }}
          animate={{ left: `${data.leaning}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 12 }}
        >
          <div className="w-10 h-10 -ml-5 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-slate-200 group">
            <div className={`w-4 h-4 rounded-full transition-all duration-500 ${
              data.advantage === 'india' ? 'bg-[#000080]' : 
              data.advantage === 'target' ? 'bg-[#FF9933]' : 
              'bg-slate-300'
            }`} />
          </div>
          
          {/* Label */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
              data.advantage === 'india' ? 'bg-blue-50 text-[#000080] border-blue-100' : 
              data.advantage === 'target' ? 'bg-orange-50 text-[#FF9933] border-orange-100' : 
              'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              {data.advantage === 'india' ? 'Strategic Lead' : 
               data.advantage === 'target' ? 'Target Lead' : 
               'Parity'}
            </span>
          </div>
        </motion.div>
      </div>

      <div className="pt-6 grid grid-cols-2 gap-3 text-[10px] z-10 relative">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 group transition-colors">
          <p className="text-slate-400 mb-1 font-bold uppercase tracking-widest">Strategic Variance</p>
          <p className="text-slate-900 font-bold text-sm">
            {Math.abs(data.indiaValue - data.targetValue).toFixed(2)}{data.unit}
          </p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 group transition-colors">
          <p className="text-slate-400 mb-1 font-bold uppercase tracking-widest">Lean Coefficient</p>
          <p className={`font-bold text-sm ${data.advantage === 'india' ? 'text-[#000080]' : 'text-[#FF9933]'}`}>
            {data.advantage === 'india' ? '+' : '-'}{(Math.abs(50 - data.leaning) * 2).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};
