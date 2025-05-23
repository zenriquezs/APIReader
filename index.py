import streamlit as st
import pandas as pd
import plotly.express as px
import requests
import time
import plotly.graph_objs as go
from streamlit_option_menu import option_menu
from numerize.numerize import numerize
from streamlit_extras.metric_cards import style_metric_cards

st.set_page_config(page_title="Dashboard", page_icon="🌍", layout="wide")
st.header("API DATA ANALYTICS: KPI, TRENDS & PREDICTIONS")

col_sidebar, col_main = st.columns([1, 100])

with col_sidebar:
    st.sidebar.title("Configuración")
    api_url = st.sidebar.text_input("Ingrese la URL de la API:")
    
    # Obtener datos desde la API con manejo de errores
    def fetch_data(api_url):
        if not api_url:
            st.sidebar.warning("Por favor, ingrese la URL de la API.")
            return pd.DataFrame()
        try:
            response = requests.get(api_url, verify=False)
            response.raise_for_status()
            data = response.json()
            return pd.DataFrame(data)
        except requests.exceptions.SSLError:
            st.sidebar.error("Error SSL: Verifica la configuración del servidor o prueba con verify=False")
            return pd.DataFrame()
        except requests.exceptions.RequestException as e:
            st.sidebar.error(f"Error al obtener datos de la API: {e}")
            return pd.DataFrame()

df = fetch_data(api_url)

if df.empty:
    st.stop()

# Detectar dinámicamente las columnas disponibles
dropdown_options = df.select_dtypes(include=['object']).columns.tolist()
numeric_columns = df.select_dtypes(include=['number']).columns.tolist()

# Validar que haya columnas disponibles
if not dropdown_options:
    dropdown_options = [df.columns[0]] if not df.empty else []
if not numeric_columns:
    numeric_columns = [df.columns[1]] if len(df.columns) > 1 else []

with col_main:
    # Mostrar máximos globales en cuadros individuales en la sección principal
    if numeric_columns:
        st.subheader("📊 Valores Máximos Detectados")
        max_values = df[numeric_columns].max()
        max_cols = st.columns(len(max_values))
        for col, (metric, value) in zip(max_cols, max_values.items()):
            with col:
                st.metric(label=metric, value=f"{value:,.2f}", help=f"Valor máximo de {metric}")

# Sidebar filtros dinámicos
with col_sidebar:
    filters = {}
    for column in dropdown_options:
        filters[column] = st.sidebar.multiselect(f"Seleccionar {column}", options=df[column].unique(), default=df[column].unique())

df_selection = df
for column, selected_values in filters.items():
    df_selection = df_selection[df_selection[column].isin(selected_values)]

with col_main:
    # Función Home
    def Home():
        with st.expander("Visualizar Dataset"):
            showData = st.multiselect('Filtrar columnas:', df_selection.columns, default=df_selection.columns.tolist())
            st.dataframe(df_selection[showData], use_container_width=True)
    
    style_metric_cards(background_color="#333333", border_left_color="#FFD700", border_color="#FFFFFF")

    # Función para gráficos dinámicos más comprensibles
    def graphs():
        if len(numeric_columns) > 1 and len(dropdown_options) > 0:
            for num_col in numeric_columns:
                df_agg = df_selection.groupby(dropdown_options[0], as_index=False)[num_col].mean()
                fig = px.bar(df_agg, x=dropdown_options[0], y=num_col, title=f"{num_col} Promedio por {dropdown_options[0]}", color=num_col, color_continuous_scale='blues')
                st.plotly_chart(fig, use_container_width=True)
                
                df_trend = df_selection.groupby(dropdown_options[0], as_index=False)[num_col].mean()
                fig_trend = px.line(df_trend, x=dropdown_options[0], y=num_col, title=f"Tendencia de {num_col} por {dropdown_options[0]}", markers=True)
                st.plotly_chart(fig_trend, use_container_width=True)
                
                df_hist = px.histogram(df_selection, x=num_col, nbins=20, title=f"Distribución de {num_col}")
                st.plotly_chart(df_hist, use_container_width=True)
                
                df_scatter = px.scatter(df_selection, x=dropdown_options[0], y=num_col, color=dropdown_options[0], title=f"Relación entre {dropdown_options[0]} y {num_col}")
                st.plotly_chart(df_scatter, use_container_width=True)
    
    # Menú lateral dinámico
    def sideBar():
        selected = option_menu(
            menu_title="Menú Principal",
            options=["Inicio", "Progreso"],
            icons=["house", "bar-chart"],
            menu_icon="cast",
            default_index=0
        )
        if selected == "Inicio":
            Home()
            graphs()
    
    sideBar()

# Ocultar elementos de Streamlit
hide_st_style = """
<style>
#MainMenu {visibility:hidden;}
footer {visibility:hidden;}
header {visibility:hidden;}
</style>
"""
st.markdown(hide_st_style, unsafe_allow_html=True)
