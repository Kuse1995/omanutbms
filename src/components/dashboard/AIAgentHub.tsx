import { motion } from "framer-motion";
import { Shield, TrendingUp, Truck, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const agents = [
  {
    id: 1,
    name: "The Auditor",
    icon: Shield,
    status: "Monitoring AtlasMara Account...",
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    progress: 78,
    activity: "Live",
  },
  {
    id: 2,
    name: "The Forecaster",
    icon: TrendingUp,
    status: "Analyzing 'LifeStraw Community' seasonal demand...",
    color: "from-violet-500 to-violet-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    progress: 45,
    activity: "Processing",
  },
  {
    id: 3,
    name: "The Dispatcher",
    icon: Truck,
    status: "Optimizing routes for Lusaka Province...",
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    progress: 92,
    activity: "Active",
  },
];

export function AIAgentHub() {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Live AI Status</h2>
          <p className="text-sm text-slate-400">3 agents actively processing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative rounded-xl border ${agent.borderColor} ${agent.bgColor} p-5 overflow-hidden`}
          >
            {/* Pulsing background effect */}
            <div className="absolute inset-0 opacity-30">
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r ${agent.color}`}
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center shadow-lg`}>
                  <agent.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <motion.div
                    className={`w-2 h-2 rounded-full bg-gradient-to-r ${agent.color}`}
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-xs font-medium text-slate-300">{agent.activity}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">Agent: {agent.name}</h3>
              <p className="text-sm text-slate-300 mb-4 min-h-[40px]">{agent.status}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white font-medium">{agent.progress}%</span>
                </div>
                <Progress 
                  value={agent.progress} 
                  className="h-1.5 bg-slate-700"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
