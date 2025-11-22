import type { APIRoute } from 'astro';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Esta ruta solo funciona en modo servidor/híbrido
// En modo estático, esta ruta no estará disponible
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const redirect = url.searchParams.get('redirect') !== 'false';

  try {
    // Ejecutar el scraper
    const { stdout, stderr } = await execAsync('node scraper.js');

    if (stderr) {
      console.error('Scraper stderr:', stderr);
    }

    // Si se solicita redirección, redirigir a la página principal con mensaje de éxito
    if (redirect) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/?success=true',
        },
      });
    }

    // Si no, retornar JSON
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Partidos actualizados correctamente',
        output: stdout,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error ejecutando scraper:', error);
    
    if (redirect) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/?error=scrape_failed',
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error al ejecutar el scraper',
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const POST: APIRoute = GET;

