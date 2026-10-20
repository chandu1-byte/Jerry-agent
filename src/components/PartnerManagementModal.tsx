import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Partner } from '../types/accounting';
import { X, UserPlus, Users, Phone, Mail, Building, Check, Edit2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PartnerManagementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { partners, projects, addPartner, updatePartner } = useAccounting();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleProject = (projId: string) => {
    if (selectedProjectIds.includes(projId)) {
      setSelectedProjectIds(selectedProjectIds.filter((id) => id !== projId));
    } else {
      setSelectedProjectIds([...selectedProjectIds, projId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      await updatePartner(editingId, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        projectIds: selectedProjectIds,
      });
      setEditingId(null);
    } else {
      await addPartner(name.trim(), phone.trim(), email.trim(), selectedProjectIds);
      setIsAdding(false);
    }

    setName('');
    setPhone('');
    setEmail('');
    setSelectedProjectIds([]);
  };

  const startEdit = (p: Partner) => {
    setEditingId(p.id);
    setName(p.name);
    setPhone(p.phone || '');
    setEmail(p.email || '');
    setSelectedProjectIds(p.projectIds || []);
    setIsAdding(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl p-6 text-slate-100 my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Partner Management</h2>
              <p className="text-xs text-slate-400">Manage real-estate venture partners and project allocations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add/Edit Form */}
        {isAdding ? (
          <form onSubmit={handleSave} className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">
                {editingId ? 'Edit Partner Profile' : 'New Partner Profile'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Partner Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Reddy"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1.5">Associated Projects</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-900 rounded-lg border border-slate-800">
                {projects.map((proj) => {
                  const isChecked = selectedProjectIds.includes(proj.id);
                  return (
                    <button
                      type="button"
                      key={proj.id}
                      onClick={() => toggleProject(proj.id)}
                      className={`text-left px-2 py-1.5 rounded text-[11px] truncate flex items-center justify-between transition ${
                        isChecked
                          ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                          : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{proj.name}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition"
              >
                {editingId ? 'Update Partner' : 'Save Partner'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-slate-400 font-medium">
              {partners.length} Registered Partners
            </span>
            <button
              onClick={() => {
                setName('');
                setPhone('');
                setEmail('');
                setSelectedProjectIds([]);
                setIsAdding(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Partner</span>
            </button>
          </div>
        )}

        {/* Partners List */}
        <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {partners.length === 0 ? (
            <div className="text-center py-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
              No partners registered yet. Click &quot;Add Partner&quot; to create a partner profile and assign them to projects.
            </div>
          ) : (
            partners.map((p) => {
              const assignedProjs = projects.filter((proj) => p.projectIds?.includes(proj.id));

              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{p.name}</span>
                      {p.phone && (
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {p.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {assignedProjs.length > 0 ? (
                        assignedProjs.map((pr) => (
                          <span
                            key={pr.id}
                            className="px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium"
                          >
                            {pr.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No projects assigned</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => startEdit(p)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
                    title="Edit Partner"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
