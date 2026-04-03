'use client';

import { Icon } from '@iconify/react';
import { Eye, Loader2, Save, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

const BACKGROUND_COLORS = [
  { value: '#000000', name: 'Pure Black', class: 'bg-black' },
  { value: '#0A0A0A', name: 'Near Black', class: 'bg-[#0A0A0A]' },
  { value: '#121212', name: 'Dark Gray', class: 'bg-[#121212]' },
  { value: '#1A1A1A', name: 'Charcoal', class: 'bg-[#1A1A1A]' },
  { value: '#0F172A', name: 'Midnight Blue', class: 'bg-[#0F172A]' },
];

const TEXT_COLORS = [
  { value: '#FFFFFF', name: 'White', class: 'bg-white' },
  { value: '#F5F5F5', name: 'Off White', class: 'bg-[#F5F5F5]' },
  { value: '#E5E5E5', name: 'Light Gray', class: 'bg-[#E5E5E5]' },
  { value: '#D4D4D4', name: 'Gray', class: 'bg-[#D4D4D4]' },
];

const SOCIAL_PLATFORMS = [
  { key: 'instagram', name: 'Instagram', icon: 'ri:instagram-fill', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'facebook', name: 'Facebook', icon: 'ri:facebook-fill', placeholder: 'https://facebook.com/yourpage' },
  { key: 'tiktok', name: 'TikTok', icon: 'ri:tiktok-fill', placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'x', name: 'X (Twitter)', icon: 'ri:twitter-x-fill', placeholder: 'https://x.com/yourhandle' },
  { key: 'threads', name: 'Threads', icon: 'ri:threads-fill', placeholder: 'https://threads.net/@yourhandle' },
  { key: 'youtube', name: 'YouTube', icon: 'ri:youtube-fill', placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'spotify', name: 'Spotify', icon: 'ri:spotify-fill', placeholder: 'https://spotify.com/artist/yourname' },
  {
    key: 'appleMusic',
    name: 'Apple Music',
    icon: 'ri:apple-music-fill',
    placeholder: 'https://music.apple.com/artist/yourname',
  },
];

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  x?: string;
  threads?: string;
  youtube?: string;
  spotify?: string;
  appleMusic?: string;
}

interface CustomizationData {
  storeId?: string;
  sliderImages: string[];
  backgroundColor: string;
  textColor: string;
  aboutText: string;
  socialLinks: SocialLinks;
}

export default function CustomizeShopPage() {
  const [data, setData] = useState<CustomizationData>({
    sliderImages: [],
    backgroundColor: '#0A0A0A',
    textColor: '#FFFFFF',
    aboutText: '',
    socialLinks: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/shop/customize');
        if (res.ok) {
          const json = await res.json();
          setData({
            sliderImages: json.sliderImages || [],
            backgroundColor: json.backgroundColor || '#0A0A0A',
            textColor: json.textColor || '#FFFFFF',
            aboutText: json.aboutText || '',
            socialLinks: json.socialLinks || {},
          });
          setCharCount((json.aboutText || '').length);
        }
      } catch (error) {
        console.error('Failed to fetch customization:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/shop/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  }, [data]);

  const handleImageUpload = async (index: number, file: File) => {
    setUploading(index);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload/slider', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const { url } = await res.json();
      const newImages = [...data.sliderImages];
      newImages[index] = url;
      setData({ ...data, sliderImages: newImages });
    } catch (error) {
      console.error('Failed to upload:', error);
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = data.sliderImages.filter((_, i) => i !== index);
    setData({ ...data, sliderImages: newImages });
  };

  const handleAddImage = () => {
    if (data.sliderImages.length < 5) {
      setData({ ...data, sliderImages: [...data.sliderImages, ''] });
    }
  };

  const handleAboutChange = (value: string) => {
    setCharCount(value.length);
    if (value.length <= 1000) {
      setData({ ...data, aboutText: value });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex">
        {/* Editor Panel */}
        <div className={`w-full ${showPreview ? 'lg:w-1/2' : 'w-full'} p-6 overflow-y-auto`}>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">Customize Your Shop</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>

          {/* Slider Images */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Hero Slider Images (max 5)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {data.sliderImages.map((url, index) => (
                <div key={index} className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden group">
                  {url ? (
                    <>
                      <Image src={url} alt={`Slide ${index + 1}`} fill className="object-cover" />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                      {uploading === index ? (
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-zinc-500 mb-2" />
                          <span className="text-xs text-zinc-500">Upload</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
              ))}
              {data.sliderImages.length < 5 && (
                <button
                  onClick={handleAddImage}
                  className="aspect-video border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center hover:border-zinc-600 transition-colors"
                >
                  <Upload className="w-6 h-6 text-zinc-500 mb-2" />
                  <span className="text-xs text-zinc-500">Add Image</span>
                </button>
              )}
            </div>
          </section>

          {/* Colors */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Colors</h2>

            <div className="mb-4">
              <span className="block text-sm text-zinc-400 mb-2">Background Color</span>
              <div className="flex gap-2">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setData({ ...data, backgroundColor: color.value })}
                    className={`w-10 h-10 rounded-lg ${color.class} transition-all ${
                      data.backgroundColor === color.value
                        ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-950'
                        : ''
                    }`}
                    title={color.name}
                    aria-label={`Select ${color.name} background`}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="block text-sm text-zinc-400 mb-2">Text Color</span>
              <div className="flex gap-2">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setData({ ...data, textColor: color.value })}
                    className={`w-10 h-10 rounded-lg ${color.class} transition-all ${
                      data.textColor === color.value ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-950' : ''
                    }`}
                    title={color.name}
                    aria-label={`Select ${color.name} text color`}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* About Text */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">About Section</h2>
            <div className="relative">
              <textarea
                value={data.aboutText}
                onChange={(e) => handleAboutChange(e.target.value)}
                placeholder="Write about yourself... Use **bold**, *italic*, and [links](url)"
                className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span
                className={`absolute bottom-2 right-2 text-xs ${charCount > 900 ? 'text-red-500' : 'text-zinc-500'}`}
              >
                {charCount}/1000
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Supports basic markdown: **bold**, *italic*, [links](url)</p>
          </section>

          {/* Social Links */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Social Media Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SOCIAL_PLATFORMS.map((platform) => (
                <div key={platform.key} className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg">
                  <Icon icon={platform.icon} className="w-5 h-5 text-zinc-400" />
                  <input
                    type="url"
                    value={data.socialLinks?.[platform.key as keyof SocialLinks] || ''}
                    onChange={(e) =>
                      setData({
                        ...data,
                        socialLinks: { ...data.socialLinks, [platform.key]: e.target.value },
                      })
                    }
                    placeholder={platform.placeholder}
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-zinc-600"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="hidden lg:block w-1/2 border-l border-zinc-800">
            <div className="sticky top-0 h-screen overflow-hidden">
              <iframe src="/shop/preview" className="w-full h-full" title="Shop Preview" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
