interface TemplateFillData {
  patient_name?: string;
  patient_first_name?: string;
  dt_name?: string;
  phone?: string;
  code?: string;
  counselling_date?: string;
}

export function fillTemplate(body: string, data: TemplateFillData): string {
  let filled = body;
  filled = filled.replace(/\{patient_name\}/g, data.patient_name ?? "");
  filled = filled.replace(
    /\{patient_first_name\}/g,
    data.patient_first_name ?? data.patient_name?.split(" ")[0] ?? ""
  );
  filled = filled.replace(/\{dt_name\}/g, data.dt_name ?? "");
  filled = filled.replace(/\{phone\}/g, data.phone ?? "");
  filled = filled.replace(/\{code\}/g, data.code ?? "");
  filled = filled.replace(
    /\{counselling_date\}/g,
    data.counselling_date ?? ""
  );
  return filled;
}
