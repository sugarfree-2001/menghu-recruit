FROM python:3.12-alpine

WORKDIR /app
COPY . /app

ENV PORT=80
ENV PYTHONUNBUFFERED=1
EXPOSE 80

CMD ["python", "simple_deploy.py"]
