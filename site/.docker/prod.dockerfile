FROM node:16.14.2
LABEL author="Shane Duffy"

RUN mkdir /usr/share/app
WORKDIR /usr/share/app

COPY package.json package.json
RUN npm i -g @angular/cli@13.3.3
COPY package-lock.json package-lock.json
RUN npm i

COPY . .

ENV PATH /node_modules/.bin:$PATH
EXPOSE 80
CMD ["npm", "run", "serve:ssr"]