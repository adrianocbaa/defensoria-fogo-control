import { supabase } from '@/integrations/supabase/client';
import { mockNuclei } from '@/data/mockNuclei';

export async function seedDatabase() {
  try {
    console.log('Iniciando population do banco de dados...');

    for (const nucleus of mockNuclei) {
      // Insert nucleus
      const { data: nucleusData, error: nucleusError } = await supabase
        .from('nuclei')
        .insert({
          id: nucleus.id,
          name: nucleus.name,
          city: nucleus.city,
          address: nucleus.address,
          has_hydrant: nucleus.hasHydrant,
          coordinates_lat: nucleus.coordinates?.lat,
          coordinates_lng: nucleus.coordinates?.lng,
          contact_phone: nucleus.contact?.phone,
          contact_email: nucleus.contact?.email,
          fire_department_license_valid_until: nucleus.fireDepartmentLicense?.validUntil?.toISOString().split('T')[0],
          fire_department_license_document_url: nucleus.fireDepartmentLicense?.documentUrl,
          created_at: nucleus.createdAt.toISOString(),
          updated_at: nucleus.updatedAt.toISOString(),
        })
        .select()
        .single();

      if (nucleusError) {
        console.error(`Erro ao inserir núcleo ${nucleus.name}:`, nucleusError);
        continue;
      }

      // Insert fire extinguishers
      if (nucleus.fireExtinguishers.length > 0) {
        const { error: extError } = await supabase
          .from('fire_extinguishers')
          .insert(
            nucleus.fireExtinguishers.map(ext => ({
              id: ext.id,
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

        if (extError) {
          console.error(`Erro ao inserir extintores do núcleo ${nucleus.name}:`, extError);
        }
      }

      // Insert documents
      if (nucleus.documents.length > 0) {
        const { error: docError } = await supabase
          .from('documents')
          .insert(
            nucleus.documents.map(doc => ({
              id: doc.id,
              nucleus_id: nucleusData.id,
              type: doc.type,
              name: doc.name,
              url: doc.url,
              uploaded_at: doc.uploadedAt.toISOString(),
              size: doc.size,
              mime_type: doc.mimeType,
            }))
          );

        if (docError) {
          console.error(`Erro ao inserir documentos do núcleo ${nucleus.name}:`, docError);
        }
      }

      console.log(`✅ Núcleo ${nucleus.name} inserido com sucesso`);
    }

    console.log('🎉 Population do banco de dados concluída!');
  } catch (error) {
    console.error('Erro geral na population do banco:', error);
  }
}