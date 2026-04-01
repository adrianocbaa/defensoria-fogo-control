import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DrawMode, ShapeData } from '@/components/checklist/PdfCanvas';

export interface ChecklistPdf {
  id: string;
  obra_id: string;
  nome_arquivo: string;
  pdf_url: string;
  total_paginas: number;
  prazo_correcao?: number | null;
  created_at: string;
}

export interface ChecklistServico {
  id: string;
  ambiente_id: string;
  obra_id: string;
  descricao: string;
  is_padrao: boolean;
  ordem: number;
  status: 'pendente' | 'aprovado' | 'reprovado';
  observacao?: string | null;
  foto_reprovacao_url?: string | null;
  foto_correcao_url?: string | null;
  foto_reprovacao_pin?: { x: number; y: number } | null;
  data_avaliacao?: string | null;
  avaliado_por?: string | null;
  location_pin?: { x: number; y: number } | null;
  gravidade?: 'critico' | 'medio' | 'estetico' | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistAmbiente {
  id: string;
  pdf_id: string;
  obra_id: string;
  pagina: number;
  nome: string;
  pos_x: number;
  pos_y: number;
  pos_w: number;
  pos_h: number;
  shape_type: DrawMode;
  shape_data: ShapeData | null;
  created_at: string;
  servicos: ChecklistServico[];
}

export function useChecklistDinamico(obraId: string) {
  const { user } = useAuth();
  const [pdfs, setPdfs] = useState<ChecklistPdf[]>([]);
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [ambientes, setAmbientes] = useState<ChecklistAmbiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const pdf = pdfs.find(p => p.id === selectedPdfId) ?? null;

  const fetchAmbientes = useCallback(async (pdfId: string) => {
    const { data, error } = await supabase
      .from('checklist_ambientes')
      .select('*, checklist_servicos(*)')
      .eq('pdf_id', pdfId)
      .order('created_at', { ascending: true });

    if (error) { console.error(error); return; }

    const toPoint = (v: any): { x: number; y: number } | null => {
      if (v && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number') {
        return { x: v.x, y: v.y };
      }
      return null;
    };

    const mapped: ChecklistAmbiente[] = (data || []).map((a: any) => ({
      ...a,
      shape_type: a.shape_type || 'rect',
      shape_data: a.shape_data || null,
      servicos: ((a.checklist_servicos || []) as any[])
        .map((s: any): ChecklistServico => ({
          ...s,
          foto_reprovacao_pin: toPoint(s.foto_reprovacao_pin),
          location_pin: toPoint(s.location_pin),
        }))
        .sort((x, y) => x.ordem - y.ordem),
    }));
    setAmbientes(mapped);
  }, []);

  const fetchPdfs = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('checklist_pdfs')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: true });

    if (error) console.error(error);
    const list = (data ?? []) as ChecklistPdf[];
    setPdfs(list);
    setLoading(false);

    // Auto-select first PDF
    if (list.length > 0) {
      const firstId = list[0].id;
      setSelectedPdfId(prev => prev && list.find(p => p.id === prev) ? prev : firstId);
    } else {
      setSelectedPdfId(null);
      setAmbientes([]);
    }
  }, [obraId]);

  useEffect(() => { fetchPdfs(); }, [fetchPdfs]);

  // When selected PDF changes, fetch its ambientes
  useEffect(() => {
    if (selectedPdfId) fetchAmbientes(selectedPdfId);
    else setAmbientes([]);
  }, [selectedPdfId, fetchAmbientes]);

  const uploadPdf = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._\-]/g, '_');
      const filePath = `${obraId}/${Date.now()}_${safeName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('checklist-pdfs')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) { toast.error('Erro ao enviar PDF: ' + uploadError.message); return; }

      const { data: { publicUrl } } = supabase.storage
        .from('checklist-pdfs')
        .getPublicUrl(uploadData.path);

      const { data, error } = await supabase
        .from('checklist_pdfs')
        .insert({
          obra_id: obraId,
          nome_arquivo: file.name,
          pdf_url: publicUrl,
          total_paginas: 1,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) { toast.error('Erro ao salvar PDF'); return; }
      const newPdf = data as ChecklistPdf;
      setPdfs(prev => [...prev, newPdf]);
      setSelectedPdfId(newPdf.id);
      toast.success(`PDF "${file.name}" enviado com sucesso!`);
    } finally {
      setUploading(false);
    }
  };

  const deletePdf = async (pdfId: string) => {
    // Delete ambientes/servicos via cascade (handled by DB FK), then delete PDF record
    const { error } = await supabase.from('checklist_pdfs').delete().eq('id', pdfId);
    if (error) { toast.error('Erro ao excluir projeto'); return; }

    const remaining = pdfs.filter(p => p.id !== pdfId);
    setPdfs(remaining);

    if (selectedPdfId === pdfId) {
      const next = remaining[0] ?? null;
      setSelectedPdfId(next?.id ?? null);
      if (!next) setAmbientes([]);
    }
    toast.success('Projeto excluído');
  };

  const updateTotalPages = async (pdfId: string, totalPaginas: number) => {
    await supabase.from('checklist_pdfs').update({ total_paginas: totalPaginas }).eq('id', pdfId);
    setPdfs(prev => prev.map(p => p.id === pdfId ? { ...p, total_paginas: totalPaginas } : p));
  };

  const updatePrazoCorrecao = async (pdfId: string, prazo: number | null) => {
    await supabase.from('checklist_pdfs').update({ prazo_correcao: prazo } as any).eq('id', pdfId);
    setPdfs(prev => prev.map(p => p.id === pdfId ? { ...p, prazo_correcao: prazo } : p));
  };

  const createAmbiente = async (
    nome: string,
    pagina: number,
    pos: { x: number; y: number; w: number; h: number },
    servicosDescricoes: { descricao: string; is_padrao: boolean }[],
    shapeType: DrawMode = 'rect',
    shapeData?: ShapeData
  ) => {
    if (!pdf || !user) return null;

    const { data: ambienteData, error: ambError } = await supabase
      .from('checklist_ambientes')
      .insert({
        pdf_id: pdf.id,
        obra_id: obraId,
        pagina,
        nome,
        pos_x: pos.x,
        pos_y: pos.y,
        pos_w: pos.w,
        pos_h: pos.h,
        shape_type: shapeType,
        shape_data: shapeData ?? null,
        user_id: user.id,
      } as any)
      .select()
      .single();

    if (ambError) { toast.error('Erro ao criar ambiente'); return null; }

    if (servicosDescricoes.length > 0) {
      const servicosToInsert = servicosDescricoes.map((s, i) => ({
        ambiente_id: ambienteData.id,
        obra_id: obraId,
        descricao: s.descricao,
        is_padrao: s.is_padrao,
        ordem: i,
        status: 'pendente',
        user_id: user.id,
      }));
      await supabase.from('checklist_servicos').insert(servicosToInsert);
    }

    await fetchAmbientes(pdf.id);
    toast.success(`Ambiente "${nome}" criado!`);
    return ambienteData;
  };

  const updateServico = async (
    servicoId: string,
    updates: {
      status?: 'pendente' | 'aprovado' | 'reprovado';
      observacao?: string;
      foto_reprovacao_url?: string | null;
      foto_correcao_url?: string | null;
      foto_reprovacao_pin?: { x: number; y: number } | null;
      location_pin?: { x: number; y: number } | null;
      gravidade?: string | null;
    }
  ) => {
    const { error } = await supabase
      .from('checklist_servicos')
      .update({
        ...updates,
        data_avaliacao: new Date().toISOString(),
        avaliado_por: user?.id,
      } as any)
      .eq('id', servicoId);

    if (error) { toast.error('Erro ao atualizar serviço'); return; }
    if (pdf?.id) await fetchAmbientes(pdf.id);
    window.dispatchEvent(new CustomEvent('checklist:refresh-ocorrencias'));
  };

  const addServico = async (ambienteId: string, descricao: string) => {
    if (!user) return;
    const existingCount = ambientes.find(a => a.id === ambienteId)?.servicos?.length ?? 0;
    const { error } = await supabase.from('checklist_servicos').insert({
      ambiente_id: ambienteId,
      obra_id: obraId,
      descricao,
      is_padrao: false,
      ordem: existingCount,
      status: 'pendente',
      user_id: user.id,
    });
    if (error) { toast.error('Erro ao adicionar serviço'); return; }
    if (pdf?.id) await fetchAmbientes(pdf.id);
  };

  const deleteAmbiente = async (ambienteId: string) => {
    const { error } = await supabase.from('checklist_ambientes').delete().eq('id', ambienteId);
    if (error) { toast.error('Erro ao excluir ambiente'); return; }
    setAmbientes(prev => prev.filter(a => a.id !== ambienteId));
    window.dispatchEvent(new CustomEvent('checklist:refresh-ocorrencias'));
    toast.success('Ambiente excluído');
  };

  const deleteServico = async (servicoId: string) => {
    await supabase.from('checklist_servicos').delete().eq('id', servicoId);
    if (pdf?.id) await fetchAmbientes(pdf.id);
    window.dispatchEvent(new CustomEvent('checklist:refresh-ocorrencias'));
  };

  const uploadFoto = async (
    file: File,
    servicoId: string,
    tipo: 'reprovacao' | 'correcao'
  ): Promise<string | null> => {
    const path = `${obraId}/${servicoId}/${tipo}_${Date.now()}.${file.name.split('.').pop()}`;
    const { data, error } = await supabase.storage
      .from('checklist-fotos')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) { toast.error('Erro ao enviar foto'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('checklist-fotos').getPublicUrl(data.path);
    return publicUrl;
  };

  const stats = {
    total: ambientes.reduce((acc, a) => acc + a.servicos.length, 0),
    aprovados: ambientes.reduce((acc, a) => acc + a.servicos.filter(s => s.status === 'aprovado').length, 0),
    reprovados: ambientes.reduce((acc, a) => acc + a.servicos.filter(s => s.status === 'reprovado').length, 0),
    pendentes: ambientes.reduce((acc, a) => acc + a.servicos.filter(s => s.status === 'pendente').length, 0),
  };

  return {
    pdf,
    pdfs,
    selectedPdfId,
    setSelectedPdfId,
    ambientes,
    loading,
    uploading,
    stats,
    uploadPdf,
    deletePdf,
    updateTotalPages,
    createAmbiente,
    updateServico,
    addServico,
    deleteAmbiente,
    deleteServico,
    uploadFoto,
    updatePrazoCorrecao,
    refetch: fetchPdfs,
  };
}
