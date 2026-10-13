{{/* Base name for every resource: "<release>-medislot", or just the release name if it already contains "medislot". */}}
{{- define "medislot.fullname" -}}
{{- if contains .Chart.Name .Release.Name -}}
{{- .Release.Name | trunc 50 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 50 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "medislot.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" -}}
{{- end -}}

{{/* Labels shared by every object. */}}
{{- define "medislot.labels" -}}
helm.sh/chart: {{ include "medislot.chart" . }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: medislot
{{- end -}}

{{/* Selector labels for one component. Usage: include "medislot.selectorLabels" (dict "ctx" . "component" "backend") */}}
{{- define "medislot.selectorLabels" -}}
app.kubernetes.io/name: {{ .ctx.Chart.Name }}
app.kubernetes.io/instance: {{ .ctx.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "medislot.componentLabels" -}}
{{ include "medislot.labels" .ctx }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{/* image reference: repository:tag, tag defaulting to the chart appVersion. Usage: include "medislot.image" (dict "image" .Values.backend.image "ctx" .) */}}
{{- define "medislot.image" -}}
{{- printf "%s:%s" .image.repository (default .ctx.Chart.AppVersion .image.tag | toString) -}}
{{- end -}}

{{- define "medislot.backendName" -}}{{ include "medislot.fullname" . }}-backend{{- end -}}
{{- define "medislot.frontendName" -}}{{ include "medislot.fullname" . }}-frontend{{- end -}}
{{- define "medislot.postgresName" -}}{{ include "medislot.fullname" . }}-postgres{{- end -}}
{{- define "medislot.dbSecretName" -}}{{ include "medislot.fullname" . }}-db{{- end -}}

{{/*
Database password: explicit value > existing Secret (so upgrades keep the same password) > new random one.
*/}}
{{- define "medislot.postgresPassword" -}}
{{- if .Values.postgres.auth.password -}}
{{- .Values.postgres.auth.password -}}
{{- else -}}
{{- $existing := lookup "v1" "Secret" .Release.Namespace (include "medislot.dbSecretName" .) -}}
{{- if and $existing $existing.data (index $existing.data "postgres-password") -}}
{{- index $existing.data "postgres-password" | b64dec -}}
{{- else -}}
{{- randAlphaNum 24 -}}
{{- end -}}
{{- end -}}
{{- end -}}
