'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchMenu, addMenuItem, updateMenuItem, deleteMenuItem, uploadImage } from '@/lib/api';

export default function AdminMenu() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    offerPrice: '',
    discountPercentage: '',
    category: 'Chicken',
    image: '',
    isAvailable: true
  });

  async function loadMenu() {
    try {
      const data = await fetchMenu();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const price = parseFloat(e.target.value);
    const offerPrice = parseFloat(formData.offerPrice);
    let discount = '';
    
    if (price && offerPrice && price > offerPrice) {
      discount = Math.round(((price - offerPrice) / price) * 100).toString();
    }
    
    setFormData({ ...formData, price: e.target.value, discountPercentage: discount });
  };

  const handleOfferPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const offerPrice = parseFloat(e.target.value);
    const price = parseFloat(formData.price);
    let discount = '';
    
    if (price && offerPrice && price > offerPrice) {
      discount = Math.round(((price - offerPrice) / price) * 100).toString();
    }
    
    setFormData({ ...formData, offerPrice: e.target.value, discountPercentage: discount });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { url } = await uploadImage(file);
      setFormData({ ...formData, image: url });
    } catch (err) {
      alert('Failed to upload image');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!editingItem;
    const targetPath = isEditing ? `/admin/menu/${editingItem._id}` : '/admin/menu';
    const method = isEditing ? 'PATCH' : 'POST';
    
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        offerPrice: formData.offerPrice ? parseFloat(formData.offerPrice) : null,
        discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : null,
      };

      if (isEditing) {
        await updateMenuItem(editingItem._id, payload);
      } else {
        await addMenuItem(payload);
      }
      setIsAdding(false);
      setEditingItem(null);
      setFormData({ name: '', description: '', price: '', offerPrice: '', discountPercentage: '', category: 'Chicken', image: '', isAvailable: true });
      loadMenu();
    } catch (err: any) {
      console.error('Menu save error:', err);
      // Construct URL for debug info - importing getCleanUrl if needed, but it's used inside the API functions
      alert(`Action failed: ${err.message || 'Unknown error'}\nMethod: ${method}\nPath: ${targetPath}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteMenuItem(id);
      loadMenu();
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (loading) return <div>Loading Menu...</div>;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase mb-2">Menu Collection</h1>
          <p className="text-stone-500 font-medium italic">Manage existing heritage dishes and special offers.</p>
        </div>
        <button 
          onClick={() => { 
            setIsAdding(true); 
            setEditingItem(null); 
            setFormData({ name: '', description: '', price: '', offerPrice: '', discountPercentage: '', category: 'Chicken', image: '', isAvailable: true });
          }}
          className="w-full md:w-auto p-6 bg-orange-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-600/20 hover:scale-105 transition-all"
        >
          Add New Item +
        </button>
      </header>

      {/* Form Overlay */}
      <AnimatePresence>
        {(isAdding || editingItem) && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-xl bg-background rounded-[3rem] p-10 shadow-2xl my-auto border border-glass-border"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">{editingItem ? 'Update Dish' : 'New Heritage Dish'}</h2>
                {editingItem && (
                   <div className="flex items-center gap-2">
                     <span className={`text-[10px] font-black uppercase tracking-widest ${formData.isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                       {formData.isAvailable ? 'Active' : 'Hidden'}
                     </span>
                     <button 
                       type="button"
                       onClick={() => setFormData({...formData, isAvailable: !formData.isAvailable})}
                       className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.isAvailable ? 'bg-green-500' : 'bg-foreground/10'}`}
                     >
                       <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
                     </button>
                   </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Dish Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Royal Lamb Shank" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required 
                      className="w-full bg-input-bg text-input-text p-5 rounded-2xl text-sm font-bold outline-none border border-input-border focus:border-orange-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Image Setup</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="https://..." 
                        value={formData.image}
                        onChange={e => setFormData({...formData, image: e.target.value})}
                        className="flex-1 bg-input-bg text-input-text p-5 rounded-2xl text-sm font-bold outline-none border border-input-border focus:border-orange-500" 
                      />
                      <label className="cursor-pointer group">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        <div className={`h-full px-6 flex items-center justify-center rounded-2xl border-2 border-dashed transition-all ${isUploading ? 'bg-orange-500 border-orange-500' : 'border-stone-200 dark:border-white/10 hover:border-orange-500'}`}>
                          {isUploading ? (
                             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                             <span className="text-xl">📸</span>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Image Preview & Presets */}
                <div className="flex flex-col md:flex-row gap-5 p-6 bg-stone-100 dark:bg-stone-900/50 rounded-[2rem] border border-glass-border">
                  <div className="w-full md:w-32 h-32 rounded-2xl bg-foreground/5 overflow-hidden shrink-0 border border-glass-border">
                    {formData.image ? (
                      <img 
                        src={formData.image} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=200&auto=format&fit=crop';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[10px] font-black text-stone-400 uppercase text-center p-2">
                        <span>No Image</span>
                        <span className="opacity-40">Preview</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Royale Presets (One-Click)</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Chicken', url: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=800&auto=format&fit=crop' },
                        { label: 'Mutton', url: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?q=80&w=600&auto=format&fit=crop' },
                        { label: 'Veg', url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=600&auto=format&fit=crop' },
                        { label: 'Starter', url: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?q=80&w=600&auto=format&fit=crop' }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, image: preset.url })}
                          className="px-4 py-2 bg-background border border-glass-border rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Description</label>
                  <textarea 
                    placeholder="Describe the flavors and heritage..." 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    required 
                    className="w-full bg-input-bg text-input-text p-5 rounded-2xl text-sm font-bold outline-none border border-input-border focus:border-orange-500 h-24" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Original Price (₹)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={formData.price}
                      onChange={handlePriceChange}
                      required 
                      className="w-full bg-input-bg text-input-text p-5 rounded-2xl text-sm font-bold outline-none border border-input-border focus:border-orange-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-input-bg text-input-text p-5 rounded-2xl text-sm font-bold outline-none border border-input-border focus:border-orange-500 h-[62px]"
                    >
                      <option>Chicken</option>
                      <option>Mutton</option>
                      <option>Veg</option>
                      <option>Starters</option>
                      <option>Beverages</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 p-6 bg-orange-500/5 rounded-[2rem] border border-orange-500/10">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-2">Offer Price (₹)</label>
                    <input 
                      type="number" 
                      placeholder="Optional" 
                      value={formData.offerPrice}
                      onChange={handleOfferPriceChange}
                      className="w-full bg-background text-foreground p-5 rounded-2xl text-sm font-bold outline-none border border-glass-border focus:border-orange-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Active Discount</label>
                    <div className="w-full bg-foreground/5 p-5 rounded-2xl text-sm font-black flex items-center justify-center text-orange-600">
                      {formData.discountPercentage ? `${formData.discountPercentage}% OFF` : 'NONE'}
                    </div>
                  </div>
                </div>

                {!editingItem && (
                   <div className="flex items-center justify-between px-2">
                     <span className="text-xs font-bold text-stone-500">Make visible to customers immediately?</span>
                     <button 
                       type="button"
                       onClick={() => setFormData({...formData, isAvailable: !formData.isAvailable})}
                       className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.isAvailable ? 'bg-orange-600' : 'bg-foreground/10'}`}
                     >
                       <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
                     </button>
                   </div>
                )}

                <div className="flex gap-4 mt-4">
                  <button type="submit" className="flex-1 p-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-xs">
                    {editingItem ? 'Save Changes' : 'Create Item'}
                  </button>
                  <button type="button" onClick={() => { setIsAdding(false); setEditingItem(null); }} className="px-8 p-5 bg-foreground/5 text-foreground rounded-2xl font-black uppercase tracking-widest text-xs">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <motion.div 
            key={item._id} 
            className={`premium-card !p-0 group relative transition-opacity overflow-hidden ${!item.isAvailable ? 'opacity-60 grayscale' : ''}`}
          >
            {/* Image Section */}
            <div className="h-48 w-full relative overflow-hidden bg-foreground/5">
              <img 
                src={item.image || 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=2000&auto=format&fit=crop'} 
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent" />
              
              <div className="absolute top-4 left-4">
                 <span className="text-[10px] font-black uppercase tracking-widest text-white bg-orange-600 px-3 py-1 rounded-full shadow-lg border border-white/20">{item.category}</span>
              </div>

              {item.offerPrice && item.isAvailable && (
                <div className="absolute top-4 right-4 bg-orange-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-lg shadow-lg rotate-12 z-10 border border-white/20">
                  {item.discountPercentage}% OFF
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                 <h3 className="text-lg font-black text-foreground uppercase tracking-tighter line-clamp-1">{item.name}</h3>
                 <div className="flex gap-2 relative z-30">
                   <button 
                    onClick={() => { 
                     setEditingItem(item); 
                     setFormData({ 
                       name: item.name, 
                       description: item.description, 
                       price: item.price.toString(), 
                       offerPrice: item.offerPrice ? item.offerPrice.toString() : '',
                       discountPercentage: item.discountPercentage ? item.discountPercentage.toString() : '',
                       category: item.category, 
                       image: item.image || '',
                       isAvailable: item.isAvailable ?? true
                     }); 
                   }} className="w-8 h-8 flex items-center justify-center bg-foreground/5 shadow-sm rounded-lg hover:bg-orange-500 hover:text-white transition-all text-xs">✏️</button>
                   <button onClick={() => handleDelete(item._id)} className="w-8 h-8 flex items-center justify-center bg-foreground/5 shadow-sm rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs">🗑️</button>
                 </div>
              </div>
              
              <p className="text-xs text-stone-500 mb-6 line-clamp-2 italic">{item.description}</p>
              
              <div className="flex items-end gap-3 mt-auto">
                {item.offerPrice ? (
                  <>
                    <p className="text-2xl font-black text-orange-600 leading-none">₹{item.offerPrice}</p>
                    <p className="text-sm font-bold text-stone-400 line-through leading-none mb-1">₹{item.price}</p>
                  </>
                ) : (
                  <p className="text-2xl font-black text-foreground leading-none">₹{item.price}</p>
                )}
              </div>
            </div>

            {!item.isAvailable && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background text-foreground text-[10px] font-black uppercase px-4 py-1.5 rounded-full z-20 shadow-xl border border-glass-border whitespace-nowrap">
                Hidden from Customers
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
