import os
import aiohttp
import zipfile
import io
from aiohttp import web
from server import PromptServer

class DoomGame:
    NAME = "DoomGame"

    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {}
    
    RETURN_TYPES = ()
    FUNCTION = "play_doom"
    OUTPUT_NODE = True
    CATEGORY = "CrasH Utils/Games"
    
    def play_doom(self):
        return ()

# Get the doom directory path
DOOM_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'doom')

# Ensure doom directory exists
os.makedirs(DOOM_DIR, exist_ok=True)

# Register route to serve DOOM files
@PromptServer.instance.routes.get('/doom/files/{filename}')
async def serve_doom_file(request):
    filename = request.match_info['filename']
    filepath = os.path.join(DOOM_DIR, filename)
    
    if not os.path.exists(filepath):
        return web.Response(status=404, text="File not found")
    
    # Security check - only allow WAD and EXE files
    allowed_extensions = ['.WAD', '.EXE', '.BAT', '.COM']
    if not any(filename.upper().endswith(ext) for ext in allowed_extensions):
        return web.Response(status=403, text="Only DOOM game files are allowed")
    
    return web.FileResponse(filepath)

# Register route to check DOOM file status
@PromptServer.instance.routes.get('/doom/status')
async def check_doom_status(request):
    exe_path = os.path.join(DOOM_DIR, 'DOOM.EXE')
    wad_path = os.path.join(DOOM_DIR, 'DOOM1.WAD')
    
    return web.json_response({
        'hasExe': os.path.exists(exe_path),
        'hasWad': os.path.exists(wad_path),
        'doomDir': DOOM_DIR
    })

# Register route to download DOOM shareware files
@PromptServer.instance.routes.post('/doom/download')
async def download_doom_files(request):
    try:
        # Try multiple sources for DOOM shareware FULL package (EXE + WAD)
        doom_urls = [
            # Archive.org - DOOM v1.1 shareware (verified working - has DOOM.EXE + DOOM1.WAD)
            "https://archive.org/download/DoomsharewareEpisode/DoomV1.1sw1993idSoftwareInc.action.zip",
            # Fallback options
            "https://distro.ibiblio.org/slitaz/sources/packages/d/doom1.zip",
            "https://ia802909.us.archive.org/8/items/doom-1.9-shareware/doom19s.zip",
        ]
        
        zip_data = None
        
        # Try each URL until one works
        async with aiohttp.ClientSession() as session:
            for doom_url in doom_urls:
                try:
                    async with session.get(doom_url, timeout=aiohttp.ClientTimeout(total=300), allow_redirects=True) as resp:
                        if resp.status == 200:
                            zip_data = await resp.read()
                            break
                except Exception:
                    continue
            
            if not zip_data:
                return web.json_response({
                    'success': False,
                    'error': 'All download sources failed. Please use manual download.'
                }, status=500)
        
        # Extract DOOM.EXE and DOOM1.WAD from the zip
        with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
            file_list = zf.namelist()
            files_extracted = []
            
            for filename in file_list:
                base_name = os.path.basename(filename).upper()
                
                # Skip directory entries
                if filename.endswith('/') or not base_name:
                    continue
                
                # Determine what file this is and what to name it
                target_name = None
                
                # Look for DOOM executable (various possible names)
                if base_name in ['DOOM.EXE', 'DOOM1.EXE', 'DOOM2.EXE'] or base_name.startswith('DOOM') and base_name.endswith('.EXE'):
                    target_name = 'DOOM.EXE'
                
                # Look for WAD files
                elif base_name in ['DOOM1.WAD', 'DOOM.WAD', 'DOOM_1.WAD']:
                    target_name = 'DOOM1.WAD'

                # Include SETUP.EXE so users can configure or for reference (not required to run)
                elif base_name == 'SETUP.EXE':
                    target_name = 'SETUP.EXE'
                
                # If we identified a needed file, extract it
                if target_name:
                    output_path = os.path.join(DOOM_DIR, target_name)
                    
                    try:
                        with zf.open(filename) as source:
                            data = source.read()
                            with open(output_path, 'wb') as target:
                                target.write(data)
                        
                        files_extracted.append(target_name)
                    except Exception as extract_err:
                        print(f"[DOOM] Error extracting {filename}: {str(extract_err)}")
        
        if not files_extracted:
            return web.json_response({
                'success': False,
                'error': f'Could not find DOOM.EXE or DOOM1.WAD in archive. Found files: {", ".join([os.path.basename(f) for f in file_list[:10]])}'
            }, status=500)
        
        return web.json_response({
            'success': True,
            'files': files_extracted,
            'message': f'Successfully downloaded: {", ".join(files_extracted)}'
        })
        
    except Exception as e:
        print(f"[DOOM] Download error: {str(e)}")
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)