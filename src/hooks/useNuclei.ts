import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Nucleus, FireExtinguisher, Document } from '@/types/nucleus';

export function useNuclei() {
  const [nuclei, setNuclei] = useState<Nucleus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch all nuclei with their fire extinguishers and documents
  const fetchNuclei = async () => {
    try {
      setLoading(true);
      
      // Fetch nuclei
      const { data: nucleiData, error: nucleiError } = await supabase
        .from('nuclei')
        .select('*')
        .order('created_at', { ascending: false });

      if (nucleiError) throw nucleiError;

      // Fetch fire extinguishers
      const { data: extinguishersData, error: extinguishersError } = await supabase
        .from('fire_extinguishers')
        .select('*');

      if (extinguishersError) throw extinguishersError;

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*');

      if (documentsError) throw documentsError;

      // Combine data
      const combinedNuclei: Nucleus[] = nucleiData.map(nucleus => ({
        id: nucleus.id,
        name: nucleus.name,
        city: nucleus.city,
        address: nucleus.address,
        hydrants: [], // Will be loaded separately
        coordinates: nucleus.coordinates_lat && nucleus.coordinates_lng 
          ? { lat: Number(nucleus.coordinates_lat), lng: Number(nucleus.coordinates_lng) }
          : undefined,
        contact: {
          phone: nucleus.contact_phone || undefined,
          email: nucleus.contact_email || undefined,
        },
        fireExtinguishers: extinguishersData
          .filter(ext => ext.nucleus_id === nucleus.id)
          .map(ext => ({
            id: ext.id,
            type: ext.type as FireExtinguisher['type'],
            expirationDate: new Date(ext.expiration_date),
            location: ext.location,
            serialNumber: ext.serial_number || undefined,
            capacity: ext.capacity || undefined,
            lastInspection: ext.last_inspection ? new Date(ext.last_inspection) : undefined,
            status: ext.status as FireExtinguisher['status'],
          })),
        documents: documentsData
          .filter(doc => doc.nucleus_id === nucleus.id)
          .map(doc => ({
            id: doc.id,
            type: doc.type as Document['type'],
            name: doc.name,
            url: doc.url,
            uploadedAt: new Date(doc.uploaded_at),
            size: doc.size || undefined,
            mimeType: doc.mime_type || undefined,
          })),
        fireDepartmentLicense: nucleus.fire_department_license_valid_until
          ? {
              validUntil: new Date(nucleus.fire_department_license_valid_until),
              documentUrl: nucleus.fire_department_license_document_url || undefined,
            }
          : undefined,
        createdAt: new Date(nucleus.created_at),
        updatedAt: new Date(nucleus.updated_at),
      }));

      setNuclei(combinedNuclei);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      console.error('Error fetching nuclei:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new nucleus
  const addNucleus = async (nucleus: Omit<Nucleus, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }
    try {
      // Insert nucleus
      const { data: nucleusData, error: nucleusError } = await supabase
        .from('nuclei')
        .insert({
          name: nucleus.name,
          city: nucleus.city,
          address: nucleus.address,
        // Hydrants will be handled separately
          coordinates_lat: nucleus.coordinates?.lat,
          coordinates_lng: nucleus.coordinates?.lng,
          contact_phone: nucleus.contact?.phone,
          contact_email: nucleus.contact?.email,
          fire_department_license_valid_until: nucleus.fireDepartmentLicense?.validUntil?.toISOString().split('T')[0],
          fire_department_license_document_url: nucleus.fireDepartmentLicense?.documentUrl,
          user_id: user.id,
        })
        .select()
        .single();

      if (nucleusError) throw nucleusError;

      // Insert fire extinguishers
      if (nucleus.fireExtinguishers.length > 0) {
        const { error: extError } = await supabase
          .from('fire_extinguishers')
          .insert(
            nucleus.fireExtinguishers.map(ext => ({
              nucleus_id: nucleusData.id,
              type: ext.type,
              expiration_date: ext.expirationDate.toISOString().split('T')[0],
              location: ext.location,
              serial_number: ext.serialNumber,
              capacity: ext.capacity,
              last_inspection: ext.lastInspection?.toISOString().split('T')[0],
              status: ext.status,
            }))
          );

        if (extError) throw extError;
      }

      // Insert documents
      if (nucleus.documents.length > 0) {
        const { error: docError } = await supabase
          .from('documents')
          .insert(
            nucleus.documents.map(doc => ({
              nucleus_id: nucleusData.id,
              type: doc.type,
              name: doc.name,
              url: doc.url,
              size: doc.size,
              mime_type: doc.mimeType,
            }))
          );

        if (docError) throw docError;
      }

      await fetchNuclei();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar núcleo');
      console.error('Error adding nucleus:', err);
    }
  };

  // Update nucleus
  const updateNucleus = async (nucleus: Nucleus) => {
    try {
      // Update nucleus
      const { error: nucleusError } = await supabase
        .from('nuclei')
        .update({
          name: nucleus.name,
          city: nucleus.city,
          address: nucleus.address,
          // Hydrants will be handled separately
          coordinates_lat: nucleus.coordinates?.lat,
          coordinates_lng: nucleus.coordinates?.lng,
          contact_phone: nucleus.contact?.phone,
          contact_email: nucleus.contact?.email,
          fire_department_license_valid_until: nucleus.fireDepartmentLicense?.validUntil?.toISOString().split('T')[0],
          fire_department_license_document_url: nucleus.fireDepartmentLicense?.documentUrl,
        })
        .eq('id', nucleus.id);

      if (nucleusError) throw nucleusError;

      await fetchNuclei();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar núcleo');
      console.error('Error updating nucleus:', err);
    }
  };

  // Get nucleus by ID
  const getNucleusById = (id: string) => {
    return nuclei.find(nucleus => nucleus.id === id);
  };

  useEffect(() => {
    fetchNuclei();
  }, []);

  return {
    nuclei,
    loading,
    error,
    addNucleus,
    updateNucleus,
    getNucleusById,
    refetch: fetchNuclei,
  };
}