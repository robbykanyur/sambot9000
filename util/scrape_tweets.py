from dotenv import load_dotenv
from pathlib import Path
import shutil
import os

basedir = os.path.dirname(os.path.abspath(os.path.dirname(__file__)))
shutil.rmtree(os.path.join(basedir, 'data'))
os.makedirs(os.path.join(basedir, 'data'))
outputdir = os.path.join(basedir, 'data/data.txt')
load_dotenv(os.path.join(basedir, '.env'))
username = os.getenv('TARGET_USER')

print('Scraping tweet URLs...')
os.system(f'snscrape twitter-user {username} >{outputdir}')

print('Scraping completed.')
