body {
    background: #171717;
    font-family: 'Segoe UI', Arial, sans-serif;
    margin: 0;
    padding: 0;
}

.container {
    max-width: 440px;
    background: #fff;
    margin: 36px auto 36px auto;
    border-radius: 24px;
    box-shadow: 0 4px 28px rgba(0,0,0,0.18);
    padding: 32px 18px 24px 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

h1 {
    text-align: center;
    margin-top: 0;
    font-size: 2rem;
    margin-bottom: 12px;
}

.actualizacion {
    font-size: 1rem;
    font-style: italic;
    color: #888;
    margin-bottom: 12px;
    text-align: center;
}

.formulario {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 18px;
}

.formulario label {
    font-size: 1rem;
    margin-top: 5px;
}

.formulario select {
    font-size: 1rem;
    padding: 6px 4px;
    border-radius: 8px;
    border: 1px solid #aaa;
    margin-bottom: 6px;
}

.formulario button {
    width: 100%;
    padding: 10px 0;
    margin: 10px 0 0 0;
    font-size: 1.12rem;
    background: #eee;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.17s;
}

.formulario button:hover {
    background: #ffd700;
    color: #222;
}

.resultado {
    width: 100%;
    margin-top: 4px;
}

#totalPagar {
    text-align: center;
    font-size: 1.3rem;
    margin-bottom: 10px;
}

.tabla-responsive {
    width: 100%;
    overflow-x: auto;
}

.tabla-vencimientos {
    width: 100%;
    border-collapse: collapse;
    margin: 0 auto;
    background: #fff;
    font-size: 1rem;
}

.tabla-vencimientos th, .tabla-vencimientos td {
    border: 1px solid #d3d3d3;
    padding: 7px 8px;
    text-align: center;
    font-size: 1rem;
}

.tabla-vencimientos th {
    background: #f5f5f5;
    font-weight: bold;
    font-size: 1.04rem;
}

.pagado {
    background: #d2f8da !important;
}

.proximo-vencimiento {
    background: #fff9c6 !important;
}

.firma {
    text-align: center;
    color: #888;
    font-size: 1rem;
    margin-top: 32px;
    margin-bottom: 0;
}

.logo {
    display: block;
    margin: 14px auto 0 auto;
    width: 72px;
    height: auto;
    max-width: 100px;
    border-radius: 100%;
    box-shadow: 0 3px 14px #0000001a;
}

@media (max-width: 600px) {
    .container {
        max-width: 98vw;
        min-width: 0;
        padding: 8vw 2vw 4vw 2vw;
    }
    .logo {
        width: 52px;
        max-width: 80px;
        margin-bottom: 16px;
    }
    .tabla-vencimientos th, .tabla-vencimientos td {
        font-size: 0.92rem;
        padding: 6px 2px;
    }
    .firma {
        font-size: 0.98rem;
    }
}

::-webkit-scrollbar {
    width: 8px;
    background: #eee;
}
::-webkit-scrollbar-thumb {
    background: #aaa;
    border-radius: 6px;
}
