import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { X, Building2, Plus, CheckCircle, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectsManagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { projects, addProject } = useAccounting();

  const [newProjectName, setNewProjectName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    await addProject(newProjectName.trim(), newDescription.trim());
    setNewProjectName('');
    setNewDescription('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl p-6 text-slate-100 my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Project Ledgers Directory</h2>
              <p className="text-xs text-slate-400">Canonical 12 projects & active real estate ventures</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alias Callout Note */}
        <div className="mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Babul Alias Rule:</strong> The name &quot;Babul&quot; is mapped to <strong>BABUL REDDY SYTE</strong> without duplicate ledger creation.
          </span>
        </div>

        {/* Add Project Form */}
        {isAdding ? (
          <form onSubmit={handleCreate} className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Add New Project Venture</h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Project Name (e.g. 100 CENTS)</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Description / Location</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Phase 3 Layout, Survey #..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition"
            >
              Add Project
            </button>
          </form>
        ) : (
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-slate-400 font-medium">
              {projects.length} Total Projects Configured
            </span>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Project</span>
            </button>
          </div>
        )}

        {/* 12 Projects Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
          {projects.map((proj, idx) => (
            <div
              key={proj.id}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start justify-between text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-white tracking-wide">{proj.name}</span>
                </div>
                {proj.aliases && proj.aliases.length > 0 && (
                  <div className="text-[10px] text-slate-400 mt-1 pl-7">
                    Aliases: {proj.aliases.join(', ')}
                  </div>
                )}
                {proj.description && (
                  <div className="text-[11px] text-slate-300 mt-0.5 pl-7">
                    {proj.description}
                  </div>
                )}
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" title="Active" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
