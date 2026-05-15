FROM python:3.12-alpine

WORKDIR /app
COPY . /app

ENV PORT=8000
EXPOSE 8000

CMD ["python", "simple_deploy.py"]
