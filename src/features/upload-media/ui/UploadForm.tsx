'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileVideo, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadMedia, Media } from '@/entities/media';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const MAX_SIZE_MB = 100;
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];

type UploadFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (media: Media) => void;
};

export function UploadForm({ isOpen, onClose, onSuccess }: UploadFormProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  // Progreso simulado para UX fluido, como exigía la guía
  const [progress, setProgress] = useState(0); 
  
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.size > MAX_BYTES) {
      toast.error(`El archivo es muy grande. El límite es ${MAX_SIZE_MB}MB.`);
      return;
    }
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      toast.error('Formato no permitido. Utilice solo Imágenes o Videos web (MP4/WebM).');
      return;
    }
    
    setFile(selectedFile);
    // Crear objeto visual
    if (selectedFile.type.startsWith('image/')) {
       setPreview(URL.createObjectURL(selectedFile));
    } else {
       setPreview(null); // usamos iconos genericos de video en pre-render
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreview(null);
    setTitulo('');
    setDescripcion('');
  };

  const onSubmit = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setProgress(20);
      
      const formData = new FormData();
      formData.append('file', file);
      // Autodeteccion de tipo según MIME
      formData.append('tipo', file.type.startsWith('video/') ? 'video' : 'imagen');
      if (titulo) formData.append('titulo', titulo);
      if (descripcion) formData.append('descripcion', descripcion);

      // Simulador de Progreso ascendente
      const interval = setInterval(() => setProgress(p => (p < 90 ? p + 10 : p)), 400);

      const result = await uploadMedia(formData);
      
      clearInterval(interval);
      setProgress(100);
      
      toast.success('Contenido guardado en Galería exitosamente');
      onSuccess(result);
      // Clean after 500ms
      setTimeout(() => {
         clearSelection();
         onClose();
         setIsUploading(false);
         setProgress(0);
      }, 500);

    } catch (err) {
      console.error(err);
      toast.error('Ocurrió un error conectando a la Nube. Intente nuevamente.');
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isUploading && onClose()} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-xl font-bold font-fraunces text-stone-dark">Agregar Contenido</h3>
          <button onClick={() => !isUploading && onClose()} disabled={isUploading} className="text-stone-400 hover:text-stone-600 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo Scroll */}
        <div className="flex-1 overflow-y-auto w-full px-6 py-6 pb-24">
           {/* Dropzone */}
           {!file ? (
             <div 
               className={`h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer relative
                          ${dragActive ? 'border-primary bg-primary/10' : 'border-stone-300 bg-stone-50 hover:bg-stone-100'}`}
               onDragEnter={handleDrag}
               onDragLeave={handleDrag}
               onDragOver={handleDrag}
               onDrop={handleDrop}
             >
                <input ref={inputRef} type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept={ALLOWED_TYPES.join(',')} onChange={handleChange} />
                <UploadCloud className={`h-12 w-12 mb-4 pointer-events-none ${dragActive ? 'text-primary' : 'text-stone-400'}`} />
                <h4 className="text-base font-semibold text-stone-700 pointer-events-none">Arrastra archivos aquí o haz click para explorar</h4>
                <p className="mt-2 text-sm text-stone-500 pointer-events-none">Imágenes (JPG, PNG) y Videos (MP4) max {MAX_SIZE_MB}MB.</p>
             </div>
           ) : (
             <div className="space-y-6">
                <div className="flex gap-4 p-4 border border-stone-200 rounded-xl bg-stone-50">
                   {preview ? (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img src={preview} alt="preview" className="h-20 w-20 object-cover rounded-lg shadow-sm" />
                   ) : (
                     <div className="h-20 w-20 flex items-center justify-center bg-stone-200 rounded-lg shadow-sm text-stone-500">
                        <FileVideo className="h-8 w-8" />
                     </div>
                   )}
                   <div className="flex-1 flex justify-between items-start">
                     <div>
                       <p className="font-medium text-stone-800 break-all line-clamp-1">{file.name}</p>
                       <p className="text-xs text-stone-500 mt-1 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.startsWith('video/') ? 'Video' : 'Imagen'}</p>
                     </div>
                     <button onClick={clearSelection} disabled={isUploading} className="text-stone-400 hover:text-red-500 transition-colors pointer-events-auto">
                        <X className="h-5 w-5" />
                     </button>
                   </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="titulo">Leyenda principal (Opcional)</Label>
                    <Input id="titulo" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Explorando aguas turquesas" disabled={isUploading} />
                  </div>
                  <div>
                    <Label htmlFor="desc">Descripción detallada (Opcional)</Label>
                    <textarea 
                      id="desc" 
                      value={descripcion} 
                      onChange={e => setDescripcion(e.target.value)} 
                      disabled={isUploading}
                      className="flex min-h-[80px] w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-dark shadow-sm placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
                    />
                  </div>
                </div>
             </div>
           )}

           {/* Progress Bar (Visible solo si subiendo) */}
           {isUploading && (
             <div className="mt-6 w-full">
                <div className="flex justify-between text-xs font-semibold text-primary mb-1">
                  <span>Enviando al Servidor de Supabase...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
             </div>
           )}
        </div>

        {/* Footer Fixed */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3 absolute bottom-0 left-0 w-full">
           <Button variant="ghost" onClick={onClose} disabled={isUploading}>Cancelar</Button>
           <Button onClick={onSubmit} disabled={!file || isUploading} className="min-w-[140px]">
             {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Subiendo...</> : 'Subir Archivo'}
           </Button>
        </div>

      </div>
    </div>
  );
}
